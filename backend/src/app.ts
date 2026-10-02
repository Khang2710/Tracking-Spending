import cors from "cors";
import express, { type Express } from "express";
import { createAuthenticateMiddleware, type VerifyAccessToken } from "./middleware/authenticate.js";
import {
  NoOcrProviderError,
  OcrProviderError,
} from "./modules/receipt-ocr/ocr.service.js";
import {
  OcrValidationError,
  validateOcrRequest,
  type OcrPayload,
} from "./modules/receipt-ocr/ocr.schemas.js";
import type { ReceiptScanResult } from "./modules/receipt-ocr/receiptItems.js";
import { createFinanceRouter } from "./modules/finance/finance.routes.js";
import type { FinanceService } from "./modules/finance/finance.repository.js";

export interface AppDependencies {
  extractReceipt(payload: OcrPayload): Promise<ReceiptScanResult>;
  verifyAccessToken: VerifyAccessToken;
  frontendOrigins?: string[];
  finance?: FinanceService;
  ocrLimit?: { maxRequests: number; windowMs: number };
}

function createOcrRateLimiter(options: { maxRequests: number; windowMs: number }) {
  const usage = new Map<string, { count: number; resetAt: number; active: boolean }>();
  return (request: import("./middleware/authenticate.js").AuthenticatedRequest, response: express.Response, next: express.NextFunction) => {
    const userId = request.auth?.user.id;
    if (!userId) return response.status(401).json({ error: "Authentication required" });
    const now = Date.now();
    const current = usage.get(userId);
    const state = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs, active: false }
      : current;
    if (state.count >= options.maxRequests || state.active) {
      response.status(429).json({ error: "Receipt analysis rate limit exceeded" });
      return;
    }
    state.count += 1;
    state.active = true;
    usage.set(userId, state);
    response.on("finish", () => { state.active = false; });
    response.on("close", () => { state.active = false; });
    next();
  };
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const allowedOrigins = new Set(dependencies.frontendOrigins ?? [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  app.disable("x-powered-by");
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed"));
    },
  }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

  const authenticate = createAuthenticateMiddleware(dependencies.verifyAccessToken);
  if (dependencies.finance) {
    app.use("/api/finance", authenticate, express.json({ limit: "1mb" }), createFinanceRouter(dependencies.finance));
  }
  app.all(
    "/api/ocr",
    authenticate,
    createOcrRateLimiter(dependencies.ocrLimit ?? { maxRequests: 20, windowMs: 60 * 60 * 1000 }),
    express.json({ limit: "12mb" }),
  );
  app.get("/api/ocr", (_request, response) => response.status(405).json({ error: "Method not allowed" }));
  app.post("/api/ocr", async (request, response) => {
    try {
      const payload = validateOcrRequest(request.body);
      response.json(await dependencies.extractReceipt(payload));
    } catch (error) {
      if (error instanceof OcrValidationError) {
        response.status(400).json({ error: error.message });
      } else if (error instanceof NoOcrProviderError) {
        response.status(503).json({ error: error.message });
      } else if (error instanceof OcrProviderError) {
        response.status(502).json({ error: error.message });
      } else {
        console.error("Receipt OCR request failed");
        response.status(500).json({ error: "Receipt analysis failed." });
      }
    }
  });

  app.use((_request, response) => response.status(404).json({ error: "Not found" }));
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
      response.status(413).json({ error: "Request body is too large" });
      return;
    }
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    response.status(500).json({ error: "Internal server error" });
  });
  return app;
}

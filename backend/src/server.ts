import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createTokenVerifier } from "./infrastructure/supabase.js";
import { createConfiguredOcrProviders } from "./modules/receipt-ocr/providers.js";
import { createReceiptOcrService } from "./modules/receipt-ocr/ocr.service.js";
import { createFinanceService } from "./modules/finance/finance.repository.js";

const config = loadEnv();
const receiptOcr = createReceiptOcrService(createConfiguredOcrProviders(config));
const app = createApp({
  extractReceipt: receiptOcr.extract,
  verifyAccessToken: createTokenVerifier(config),
  frontendOrigins: config.frontendOrigins,
  nodeEnv: config.nodeEnv,
  allowPrivateLanOrigins: config.allowPrivateLanOrigins,
  finance: createFinanceService(config),
});

const server = app.listen(config.port, () => {
  console.info(`Wealthy backend listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

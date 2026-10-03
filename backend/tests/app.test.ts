import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createReceiptOcrService, NoOcrProviderError, OcrProviderError } from "../src/modules/receipt-ocr/ocr.service.js";

describe("backend API", () => {
  const authenticated = { verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }) };
  const withAuth = (requestBuilder: request.Test) =>
    requestBuilder.set("Authorization", "Bearer valid-user-token");

  it("reports health without provider configuration", async () => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated });

    await request(app).get("/api/health").expect(200, { status: "ok" });
  });

  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.1.2.3:5173",
    "http://10.0.0.1:5173",
    "http://10.255.255.254:5173",
    "http://172.16.0.1:5173",
    "http://172.31.255.254:5173",
    "http://192.168.1.42:5173",
  ])("allows development Vite requests from %s", async (origin) => {
    const app = createApp({
      extractReceipt: vi.fn(),
      ...authenticated,
      nodeEnv: "development",
      frontendOrigins: ["https://wealthy.example"],
    });

    const response = await request(app).get("/api/health").set("Origin", origin).expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("allows a development LAN preflight for authenticated API requests", async () => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated, nodeEnv: "development" });

    const response = await request(app)
      .options("/api/ocr")
      .set("Origin", "http://192.168.1.42:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("http://192.168.1.42:5173");
    expect(response.headers["access-control-allow-headers"]).toBe("authorization,content-type");
  });

  it.each([
    "http://8.8.8.8:5173",
    "http://172.15.255.255:5173",
    "http://172.32.0.1:5173",
    "http://192.169.1.42:5173",
    "http://169.254.1.42:5173",
    "http://100.64.0.1:5173",
    "http://0.0.0.0:5173",
    "http://192.168.1.42:5174",
    "http://localhost:8080",
    "https://192.168.1.42:5173",
    "http://192.168.1.42.evil.example:5173",
    "http://192.168.1.42:5173/path",
    "http://user@192.168.1.42:5173",
    "http://192.168.999.1:5173",
    "null",
  ])("rejects untrusted development origin %s", async (origin) => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated, nodeEnv: "development" });

    const response = await request(app).get("/api/health").set("Origin", origin).expect(500);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it.each(["production", "test", undefined] as const)(
    "keeps %s mode restricted to the configured origin allowlist",
    async (nodeEnv) => {
      const app = createApp({
        extractReceipt: vi.fn(),
        ...authenticated,
        nodeEnv,
        frontendOrigins: ["https://wealthy.example"],
      });

      const allowed = await request(app)
        .get("/api/health").set("Origin", "https://wealthy.example").expect(200);
      expect(allowed.headers["access-control-allow-origin"]).toBe("https://wealthy.example");

      for (const origin of ["http://192.168.1.42:5173", "http://localhost:5173"]) {
        const blocked = await request(app).get("/api/health").set("Origin", origin).expect(500);
        expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
      }
    },
  );

  it("rejects protected requests without an access token", async () => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated });

    await request(app).post("/api/ocr").send({}).expect(401, {
      error: "Authentication required",
    });
  });

  it("rejects malformed OCR input before calling the service", async () => {
    const extractReceipt = vi.fn();
    const app = createApp({ extractReceipt, ...authenticated });

    const response = await withAuth(request(app)
      .post("/api/ocr")
      .send({ imageBase64: "bad!", mimeType: "image/jpeg" }))
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid image encoding" });
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("returns the complete normalized receipt breakdown", async () => {
    const service = createReceiptOcrService([{
      extract: async () => '{"items":[{"name":"Food","price":191}],"tax":7,"serviceCharge":36,"tip":0,"billDiscount":0,"otherFees":0,"receiptTotal":234}',
    }]);
    const app = createApp({ extractReceipt: service.extract, ...authenticated });

    await withAuth(request(app)
      .post("/api/ocr")
      .send({ imageBase64: "iVBORw0KGgo=", mimeType: "image/png" }))
      .expect(200, { items: [{ name: "Food", price: 191 }], tax: 7, serviceCharge: 36, tip: 0, billDiscount: 0, otherFees: 0, receiptTotal: 234 });
  });

  it("maps missing configuration to 503 and provider failures to 502", async () => {
    const unavailable = createApp({
      extractReceipt: vi.fn().mockRejectedValue(new NoOcrProviderError()),
      ...authenticated,
    });
    const failed = createApp({
      extractReceipt: vi.fn().mockRejectedValue(new OcrProviderError()),
      ...authenticated,
    });
    const body = { imageBase64: "/9j/", mimeType: "image/jpeg" };

    await withAuth(request(unavailable).post("/api/ocr").send(body)).expect(503, {
      error: "Receipt analysis is not configured.",
    });
    await withAuth(request(failed).post("/api/ocr").send(body)).expect(502, {
      error: "Receipt analysis is temporarily unavailable.",
    });
  });

  it("does not accept GET requests on the OCR endpoint", async () => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated });

    await withAuth(request(app).get("/api/ocr")).expect(405, { error: "Method not allowed" });
  });

  it("limits repeated paid OCR requests per authenticated user", async () => {
    const app = createApp({
      extractReceipt: vi.fn().mockResolvedValue({
        items: [{ name: "Coffee", price: 5 }],
        serviceCharge: 0,
        tax: 0,
        tip: 0,
        billDiscount: 0,
        otherFees: 0,
        receiptTotal: null,
      }),
      ...authenticated,
      ocrLimit: { maxRequests: 2, windowMs: 60_000 },
    });
    const body = { imageBase64: "iVBORw0KGgo=", mimeType: "image/png" };

    await withAuth(request(app).post("/api/ocr").send(body)).expect(200);
    await withAuth(request(app).post("/api/ocr").send(body)).expect(200);
    await withAuth(request(app).post("/api/ocr").send(body)).expect(429, {
      error: "Receipt analysis rate limit exceeded",
    });
  });
});

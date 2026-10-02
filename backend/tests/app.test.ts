import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { NoOcrProviderError, OcrProviderError } from "../src/modules/receipt-ocr/ocr.service.js";

describe("backend API", () => {
  const authenticated = { verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }) };
  const withAuth = (requestBuilder: request.Test) =>
    requestBuilder.set("Authorization", "Bearer valid-user-token");

  it("reports health without provider configuration", async () => {
    const app = createApp({ extractReceipt: vi.fn(), ...authenticated });

    await request(app).get("/api/health").expect(200, { status: "ok" });
  });

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

  it("returns normalized OCR items and receipt service charge", async () => {
    const extractReceipt = vi.fn().mockResolvedValue({
      items: [{ name: "Coffee", price: 5 }],
      serviceCharge: 1,
    });
    const app = createApp({ extractReceipt, ...authenticated });

    await withAuth(request(app)
      .post("/api/ocr")
      .send({ imageBase64: "iVBORw0KGgo=", mimeType: "image/png" }))
      .expect(200, { items: [{ name: "Coffee", price: 5 }], serviceCharge: 1 });
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

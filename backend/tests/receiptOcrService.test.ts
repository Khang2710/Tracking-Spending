import { describe, expect, it, vi } from "vitest";
import {
  NoOcrProviderError,
  OcrProviderError,
  createReceiptOcrService,
  type OcrProvider,
} from "../src/modules/receipt-ocr/ocr.service.js";

const payload = { imageBase64: "aGVsbG8=", mimeType: "image/jpeg" } as const;

describe("receipt OCR provider orchestration", () => {
  it("returns parsed items from the first successful provider", async () => {
    const groq: OcrProvider = { extract: vi.fn().mockResolvedValue('{"items":[{"name":"Tea","price":3}],"serviceCharge":36}') };
    const fallback: OcrProvider = { extract: vi.fn() };
    const service = createReceiptOcrService([groq, fallback]);

    await expect(service.extract(payload)).resolves.toEqual({ items: [{ name: "Tea", price: 3 }], serviceCharge: 36 });
    expect(fallback.extract).not.toHaveBeenCalled();
  });

  it("falls back when the first provider fails or returns no items", async () => {
    const groq: OcrProvider = { extract: vi.fn().mockRejectedValue(new Error("upstream")) };
    const openRouter: OcrProvider = {
      extract: vi.fn().mockResolvedValue('{"items":[{"name":"Rice","price":"12.000"}]}'),
    };
    const service = createReceiptOcrService([groq, openRouter]);

    await expect(service.extract(payload)).resolves.toEqual({ items: [{ name: "Rice", price: 12_000 }], serviceCharge: 0 });
  });

  it("falls back when a provider returns a charge without purchased items", async () => {
    const empty: OcrProvider = { extract: async () => '{"items":[],"serviceCharge":36}' };
    const fallback: OcrProvider = {
      extract: async () => '{"items":[{"name":"Egust","price":35}],"serviceCharge":36}',
    };

    await expect(createReceiptOcrService([empty, fallback]).extract(payload)).resolves.toEqual({
      items: [{ name: "Egust", price: 35 }], serviceCharge: 36,
    });
  });

  it("reports missing provider configuration", async () => {
    await expect(createReceiptOcrService([]).extract(payload)).rejects.toBeInstanceOf(
      NoOcrProviderError,
    );
  });

  it("returns a sanitized provider error after all providers fail", async () => {
    const provider: OcrProvider = { extract: vi.fn().mockRejectedValue(new Error("secret response")) };

    await expect(createReceiptOcrService([provider]).extract(payload)).rejects.toEqual(
      new OcrProviderError("Receipt analysis is temporarily unavailable."),
    );
  });
});

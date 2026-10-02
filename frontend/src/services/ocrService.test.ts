import { afterEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.hoisted(() => vi.fn());
vi.mock("./apiClient", () => ({ apiRequest: apiRequestMock }));
import { processReceiptOcr } from "./ocrService";

describe("processReceiptOcr", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses only the same-origin OCR endpoint without sending a provider key", async () => {
    apiRequestMock.mockResolvedValue({ items: [{ name: "Coffee", price: 5 }], serviceCharge: 1 });

    const result = await processReceiptOcr({
      pureBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/jpeg",
    });

    expect(result).toEqual({ items: [{ name: "Coffee", price: 5 }], serviceCharge: 1 });
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock.mock.calls[0]?.[0]).toBe("/api/ocr");
    expect(JSON.parse(String(apiRequestMock.mock.calls[0]?.[1]?.body))).toEqual({
      imageBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/jpeg",
    });
  });

  it("filters malformed items while preserving the receipt service charge", async () => {
    apiRequestMock.mockResolvedValue({
      items: [{ name: "Coffee", price: 5 }, null, { name: "Cake", price: "4" }],
      serviceCharge: 1,
    });

    expect(await processReceiptOcr({ pureBase64: "ZmFrZS1pbWFnZQ==", mimeType: "image/png" }))
      .toEqual({ items: [{ name: "Coffee", price: 5 }], serviceCharge: 1 });
  });

  it.each([undefined, -1, "10%", Infinity, NaN])("defaults invalid service charge %s to zero", async (serviceCharge) => {
    apiRequestMock.mockResolvedValue({ items: [{ name: "Coffee", price: 5 }], serviceCharge });

    expect(await processReceiptOcr({ pureBase64: "ZmFrZS1pbWFnZQ==", mimeType: "image/png" }))
      .toEqual({ items: [{ name: "Coffee", price: 5 }], serviceCharge: 0 });
  });

  it("returns an empty structured result for malformed receipt data", async () => {
    apiRequestMock.mockResolvedValue(null);

    expect(await processReceiptOcr({ pureBase64: "ZmFrZS1pbWFnZQ==", mimeType: "image/png" }))
      .toEqual({ items: [], serviceCharge: 0 });
  });

  it("surfaces backend failures so the scanner can show an actionable message", async () => {
    apiRequestMock.mockRejectedValue(new Error("offline"));

    await expect(processReceiptOcr({
      pureBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/png",
    })).rejects.toThrow("offline");

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });
});

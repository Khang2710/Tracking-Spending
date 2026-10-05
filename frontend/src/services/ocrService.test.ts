import { afterEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.hoisted(() => vi.fn());
vi.mock("./apiClient", () => ({ apiRequest: apiRequestMock }));
import { processReceiptOcr } from "./ocrService";

describe("processReceiptOcr", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses only the same-origin OCR endpoint without sending a provider key", async () => {
    apiRequestMock.mockResolvedValue([{ name: "Coffee", price: 5 }]);

    const items = await processReceiptOcr({
      pureBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/jpeg",
    });

    expect(items).toEqual([{ name: "Coffee", price: 5 }]);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock.mock.calls[0]?.[0]).toBe("/api/ocr");
    expect(JSON.parse(String(apiRequestMock.mock.calls[0]?.[1]?.body))).toEqual({
      imageBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/jpeg",
    });
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

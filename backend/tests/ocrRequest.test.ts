import { describe, expect, it } from "vitest";
import { OcrValidationError, validateOcrRequest } from "../src/modules/receipt-ocr/ocr.schemas.js";

describe("validateOcrRequest", () => {
  it("accepts a supported base64 image payload", () => {
    expect(
      validateOcrRequest({ imageBase64: "iVBORw0KGgo=", mimeType: "image/png" }),
    ).toEqual({ imageBase64: "iVBORw0KGgo=", mimeType: "image/png" });
  });

  it("rejects an unsupported MIME type", () => {
    expect(() =>
      validateOcrRequest({ imageBase64: "iVBORw0KGgo=", mimeType: "application/pdf" }),
    ).toThrowError(new OcrValidationError("Unsupported image type"));
  });

  it("rejects malformed base64 rather than forwarding it to an AI provider", () => {
    expect(() =>
      validateOcrRequest({ imageBase64: "not base64!", mimeType: "image/jpeg" }),
    ).toThrowError(new OcrValidationError("Invalid image encoding"));
  });

  it("rejects empty data URLs and content that is not the declared image type", () => {
    expect(() => validateOcrRequest({
      imageBase64: "data:image/png;base64,",
      mimeType: "image/png",
    })).toThrowError(new OcrValidationError("Missing image payload"));
    expect(() => validateOcrRequest({
      imageBase64: Buffer.from("plain text").toString("base64"),
      mimeType: "image/png",
    })).toThrowError(new OcrValidationError("Image content does not match its type"));
  });

  it("rejects decoded images larger than 8 MiB", () => {
    const tooLarge = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");

    expect(() =>
      validateOcrRequest({ imageBase64: tooLarge, mimeType: "image/webp" }),
    ).toThrowError(new OcrValidationError("Image payload is too large"));
  });
});

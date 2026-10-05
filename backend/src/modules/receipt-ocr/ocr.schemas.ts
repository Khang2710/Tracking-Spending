import { z } from "zod";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const requestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
}).strict();

export interface OcrPayload {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export class OcrValidationError extends Error {}

function matchesImageSignature(image: Buffer, mimeType: OcrPayload["mimeType"]): boolean {
  if (mimeType === "image/jpeg") {
    return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return image.length >= 12 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP";
}

export function validateOcrRequest(input: unknown): OcrPayload {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    const mimeIssue = parsed.error.issues.some((issue) => issue.path[0] === "mimeType");
    throw new OcrValidationError(mimeIssue ? "Unsupported image type" : "Missing image payload");
  }

  const dataPrefix = parsed.data.imageBase64.match(/^data:[^;]+;base64,/i)?.[0] ?? "";
  const imageBase64 = parsed.data.imageBase64.slice(dataPrefix.length);
  if (!imageBase64) throw new OcrValidationError("Missing image payload");
  const maxEncodedLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (imageBase64.length > maxEncodedLength) {
    throw new OcrValidationError("Image payload is too large");
  }
  const padding = imageBase64.endsWith("==") ? 2 : imageBase64.endsWith("=") ? 1 : 0;
  const decodedBytes = (imageBase64.length * 3) / 4 - padding;
  if (decodedBytes > MAX_IMAGE_BYTES) {
    throw new OcrValidationError("Image payload is too large");
  }
  if (!BASE64_PATTERN.test(imageBase64)) {
    throw new OcrValidationError("Invalid image encoding");
  }
  const decoded = Buffer.from(imageBase64, "base64");
  if (!matchesImageSignature(decoded, parsed.data.mimeType)) {
    throw new OcrValidationError("Image content does not match its type");
  }

  return { imageBase64, mimeType: parsed.data.mimeType };
}

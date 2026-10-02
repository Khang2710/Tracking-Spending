import { apiRequest } from "./apiClient";

export interface OcrParsedItem {
  name: string;
  price: number;
}

export interface OcrScanResult {
  items: OcrParsedItem[];
  tax: number;
  serviceCharge: number;
  tip: number;
  billDiscount: number;
  otherFees: number;
  receiptTotal: number | null;
}

export interface ProcessReceiptOptions {
  pureBase64: string;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: (percent: number, statusText: string) => void;
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromExternalSignal = () => controller.abort();

  externalSignal?.addEventListener("abort", abortFromExternalSignal);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

export async function processReceiptOcr({
  pureBase64,
  mimeType,
  signal,
  onProgress,
}: ProcessReceiptOptions): Promise<OcrScanResult> {
  onProgress?.(25, "AI Proxy OCR");

  try {
    const data = await withTimeout(
      (requestSignal) => apiRequest<unknown>("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: pureBase64, mimeType }),
        signal: requestSignal,
      }),
      35_000,
      signal,
    );
    if (typeof data !== "object" || data === null || !("items" in data) || !Array.isArray(data.items)) {
      onProgress?.(100, "Finished");
      return emptyOcrScanResult();
    }

    const items = data.items.filter(
      (item): item is OcrParsedItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as OcrParsedItem).name === "string" &&
        typeof (item as OcrParsedItem).price === "number",
    );

    onProgress?.(100, items.length > 0 ? "Success" : "Finished");
    return {
      items,
      tax: readAmount(data, "tax"),
      serviceCharge: readAmount(data, "serviceCharge"),
      tip: readAmount(data, "tip"),
      billDiscount: readAmount(data, "billDiscount"),
      otherFees: readAmount(data, "otherFees"),
      receiptTotal: readNullableAmount(data, "receiptTotal"),
    };
  } catch (error) {
    onProgress?.(100, "Finished");
    throw error;
  }
}

function emptyOcrScanResult(): OcrScanResult {
  return { items: [], tax: 0, serviceCharge: 0, tip: 0, billDiscount: 0, otherFees: 0, receiptTotal: null };
}

function readAmount(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function readNullableAmount(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

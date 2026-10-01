import { extractReceiptItems, type ReceiptItem } from "./receiptItems.js";
import type { OcrPayload } from "./ocr.schemas.js";

export interface OcrProvider {
  extract(payload: OcrPayload): Promise<string>;
}

export class NoOcrProviderError extends Error {
  constructor(message = "Receipt analysis is not configured.") {
    super(message);
  }
}

export class OcrProviderError extends Error {
  constructor(message = "Receipt analysis is temporarily unavailable.") {
    super(message);
  }
}

export function createReceiptOcrService(providers: OcrProvider[]) {
  return {
    async extract(payload: OcrPayload): Promise<ReceiptItem[]> {
      if (providers.length === 0) throw new NoOcrProviderError();
      for (const provider of providers) {
        try {
          const items = extractReceiptItems(await provider.extract(payload));
          if (items.length > 0) return items;
        } catch {
          // The next configured provider is the deliberate fallback.
        }
      }
      throw new OcrProviderError();
    },
  };
}

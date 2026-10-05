import type { OcrPayload } from "./ocr.schemas.js";
import type { OcrProvider } from "./ocr.service.js";

const RECEIPT_PROMPT = `Extract every purchased receipt line and its line total. Return only a JSON array with objects shaped as {"name":"item","price":12.34}. Use the line total, not quantity or unit price. Exclude tax, tips, discounts, and payment lines. Price must be a positive JSON number without currency symbols.`;

interface ProviderOptions {
  apiKey: string;
  endpoint: string;
  model: string;
  extraHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export function createOpenAiCompatibleVisionProvider(options: ProviderOptions): OcrProvider {
  return {
    async extract(payload: OcrPayload): Promise<string> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await (options.fetchImpl ?? fetch)(options.endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.apiKey}`,
            ...options.extraHeaders,
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: 1200,
            messages: [
              { role: "system", content: RECEIPT_PROMPT },
              {
                role: "user",
                content: [{
                  type: "image_url",
                  image_url: { url: `data:${payload.mimeType};base64,${payload.imageBase64}` },
                }],
              },
            ],
          }),
        });
        if (!response.ok) throw new Error("OCR provider request failed");
        const result = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        return result.choices?.[0]?.message?.content ?? "";
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createConfiguredOcrProviders(config: {
  groqApiKey?: string;
  openRouterApiKey?: string;
}): OcrProvider[] {
  const providers: OcrProvider[] = [];
  if (config.groqApiKey?.startsWith("gsk_")) {
    providers.push(createOpenAiCompatibleVisionProvider({
      apiKey: config.groqApiKey,
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    }));
  }
  if (config.openRouterApiKey?.startsWith("sk-")) {
    providers.push(createOpenAiCompatibleVisionProvider({
      apiKey: config.openRouterApiKey,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "google/gemini-2.5-flash",
      extraHeaders: { "X-Title": "Wealthy Receipt OCR" },
    }));
  }
  return providers;
}

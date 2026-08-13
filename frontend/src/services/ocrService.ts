export interface OcrParsedItem {
  name: string;
  price: number;
}

export type ExtractedItem = OcrParsedItem;

export interface ProcessReceiptOptions {
  pureBase64: string;
  mimeType: string;
  formattedBase64: string;
  userApiKey?: string;
  defaultNameLabel?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number, statusText: string) => void;
}

export function parsePriceHelper(rawPrice: unknown): number {
  if (typeof rawPrice === "number" && !isNaN(rawPrice) && isFinite(rawPrice)) {
    return Math.abs(rawPrice);
  }
  if (!rawPrice) return 0;

  const strP = String(rawPrice).trim();
  if (/^\d+$/.test(strP)) {
    return parseFloat(strP) || 0;
  }

  const thousandMatch = strP.match(/\b\d{1,3}(?:[.,]\d{3})+\b/);
  if (thousandMatch) {
    const cleanVnd = thousandMatch[0].replace(/[.,]/g, "");
    return parseFloat(cleanVnd) || 0;
  }

  const numMatch = strP.match(/\d+(?:[.,]\d+)*/);
  if (!numMatch) return 0;

  let numStr = numMatch[0];

  if (/\.\d{1,2}$/.test(numStr)) {
    numStr = numStr.replace(/,/g, "");
    return parseFloat(numStr) || 0;
  } else if (/,\d{1,2}$/.test(numStr)) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
    return parseFloat(numStr) || 0;
  }

  const cleanVnd = numStr.replace(/[.,]/g, "");
  return parseFloat(cleanVnd) || 0;
}

export function parseRawReceiptText(rawReceipt: string, defaultName = "Món ăn"): OcrParsedItem[] {
  const lines = rawReceipt.split("\n");
  const parsedItems: OcrParsedItem[] = [];

  lines.forEach((line) => {
    const match = line.match(/(.*?)\$?(\d+(?:\.\d{1,2})?)\s*$/);
    if (match) {
      const name = match[1].trim().replace(/^[\d\s.\-*]+/, "") || defaultName;
      const price = parseFloat(match[2]);
      if (name && !isNaN(price)) {
        parsedItems.push({ name, price });
      }
    }
  });

  return parsedItems;
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit = {},
  timeoutMs = 25000,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort);
  }

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

const OCR_PROMPT = `Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.

YÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN (PRICE):
1. Bắt buộc lấy đúng con số ở cột "Thành tiền" (Total Amount = Số lượng x Đơn giá).
2. TUYỆT ĐỐI KHÔNG lấy ở cột "Đơn giá" (Unit Price) hay cột "Số lượng".
3. Loại bỏ hoàn toàn mọi dấu chấm, dấu phẩy phân cách hàng nghìn. Chỉ trả về số nguyên thuần túy kiểu Number (ví dụ: 9000 thay vì "9.000", 56000 thay vì "56.000").
4. CHỈ TRẢ VỀ DUY NHẤT CON SỐ NGUYÊN CỦA THÀNH TIỀN trong trường "price". TUYỆT ĐỐI KHÔNG ghi thêm ghi chú, phép tính, số lượng hay chữ viết khác.

Tuyệt đối KHÔNG trả về markdown (không dùng \`\`\`json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về một mảng JSON theo format chuẩn xác sau:
[
  {
    "name": "Tiger nâu",
    "price": 56000
  },
  {
    "name": "Bánh tráng",
    "price": 9000
  }
]
Bỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.`;

function extractJsonItems(cleanText: string, defaultName: string): OcrParsedItem[] {
  let itemsJson: Array<{ name?: string; item?: string; description?: string; price?: unknown; amount?: unknown; total?: unknown }> = [];
  const objMatch = cleanText.match(/\{\s*"items"[\s\S]*\}/);
  const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);

  if (objMatch) {
    const parsedObj = JSON.parse(objMatch[0]);
    if (Array.isArray(parsedObj.items)) itemsJson = parsedObj.items;
  } else if (arrayMatch) {
    itemsJson = JSON.parse(arrayMatch[0]);
  } else {
    try {
      const directParse = JSON.parse(cleanText);
      itemsJson = Array.isArray(directParse) ? directParse : (directParse.items || []);
    } catch (e) {
      console.warn("Direct JSON parse failed:", e);
    }
  }

  if (Array.isArray(itemsJson) && itemsJson.length > 0) {
    return itemsJson.map((it) => {
      const name = String(it.name || it.item || it.description || defaultName).trim();
      const rawPrice = it.price || it.amount || it.total || 0;
      const price = parsePriceHelper(rawPrice);
      return { name, price };
    });
  }

  return [];
}

/**
 * 3-Tier Fallback OCR Execution Pipeline:
 * Tier 1: Vercel Serverless Proxy (/api/ocr)
 * Tier 2: Client Direct REST Call (OpenRouter/Groq/OpenAI)
 * Tier 3: Spring Boot Backend (/api/ocr/scan)
 */
export async function processReceiptOcr(options: ProcessReceiptOptions): Promise<OcrParsedItem[]> {
  const {
    pureBase64,
    mimeType,
    formattedBase64,
    userApiKey = "",
    defaultNameLabel = "Món ăn",
    signal,
    onProgress,
  } = options;

  let parsedItems: OcrParsedItem[] = [];

  // Tier 1: Vercel Serverless Proxy
  onProgress?.(25, "AI Proxy OCR");
  try {
    const res = await fetchWithTimeout(
      "/api/ocr",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: pureBase64,
          mimeType,
          apiKey: userApiKey.trim(),
        }),
      },
      25000,
      signal
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        onProgress?.(100, "Success");
        return data;
      }
    }
  } catch (proxyErr) {
    console.warn("Vercel Serverless /api/ocr proxy failed, attempting client fallback...", proxyErr);
  }

  // Tier 2: Direct Client Call if Key Available
  const key = userApiKey.trim() || (import.meta.env.VITE_GROQ_KEY as string) || (import.meta.env.VITE_OPENAI_KEY as string) || localStorage.getItem("groq_api_key") || "";
  if (parsedItems.length === 0 && key) {
    onProgress?.(55, "Direct AI Fallback");
    const isOpenRouter = key.startsWith("sk-or-v1-") || key.startsWith("sk-");
    const isGroq = key.startsWith("gsk_");
    const apiUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const modelName = isOpenRouter
      ? "google/gemini-2.5-flash"
      : isGroq
      ? "qwen/qwen3.6-27b"
      : "gpt-4o";

    try {
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modelName,
            max_tokens: 2000,
            messages: [
              { role: "system", content: OCR_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: "Trích xuất danh sách món ăn và giá tiền từ hoá đơn này." },
                  { type: "image_url", image_url: { url: formattedBase64 } }
                ],
              },
            ],
          }),
        },
        20000,
        signal
      );

      if (response.ok) {
        const result = await response.json();
        const rawContent = result.choices?.[0]?.message?.content || "";
        const cleanText = rawContent
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        parsedItems = extractJsonItems(cleanText, defaultNameLabel);
        if (parsedItems.length > 0) {
          onProgress?.(100, "Success");
          return parsedItems;
        }
      }
    } catch (clientErr) {
      console.warn("Client-side direct OCR failed or timed out:", clientErr);
    }
  }

  // Tier 3: Spring Boot Backend Fallback
  if (parsedItems.length === 0) {
    onProgress?.(80, "Backend OCR");
    try {
      const backendHost = import.meta.env.VITE_BACKEND_URL || "https://tracking-spending-backend.onrender.com";
      const res = await fetchWithTimeout(
        `${backendHost}/api/ocr/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: pureBase64, mimeType }),
        },
        15000,
        signal
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          onProgress?.(100, "Success");
          return data;
        }
      }
    } catch (err) {
      console.error("Backend OCR error/timeout:", err);
    }
  }

  onProgress?.(100, "Finished");
  return parsedItems;
}

export async function processReceiptImage(
  base64Data: string,
  userApiKey?: string,
  fallbackName = "Món ăn"
): Promise<OcrParsedItem[]> {
  const mimeType =
    base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";")) ||
    "image/jpeg";
  const pureBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const formattedBase64 = base64Data.startsWith("data:")
    ? base64Data
    : `data:${mimeType};base64,${pureBase64}`;

  return processReceiptOcr({
    pureBase64,
    mimeType,
    formattedBase64,
    userApiKey,
    defaultNameLabel: fallbackName,
  });
}

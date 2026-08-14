import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface OcrItem {
  name: string;
  price: number;
  currency?: string;
}

export interface OcrRequestBody {
  imageBase64?: string;
  mimeType?: string;
  apiKey?: string;
}

function getCleanKey(key?: string): string {
  if (!key) return "";
  const trimmed = String(key).trim();
  if (trimmed === "undefined" || trimmed === "null" || trimmed === '""' || trimmed === "''") return "";
  return trimmed;
}

function parsePriceHelper(rawPrice: unknown): number {
  if (typeof rawPrice === "number" && !isNaN(rawPrice) && isFinite(rawPrice)) {
    return Math.abs(rawPrice);
  }
  if (!rawPrice) return 0;

  const strP = String(rawPrice).trim();

  // Pure integer string like "56000" or "13"
  if (/^\d+$/.test(strP)) {
    return parseFloat(strP) || 0;
  }

  // Pure decimal string like "13.00", "3.50", "34.61"
  if (/^\d+\.\d{1,2}$/.test(strP)) {
    return parseFloat(strP) || 0;
  }

  // Check decimal currency pattern with 1 or 2 decimals (e.g. $13.00, 3.50, 123.45)
  if (/\.\d{1,2}$/.test(strP) && !/\.\d{3}$/.test(strP)) {
    const cleanStr = strP.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleanStr);
    if (!isNaN(parsed)) return parsed;
  }

  // 1. Look for formatted thousand numbers (e.g. 9.000, 56.000, 3.565.000)
  const thousandMatch = strP.match(/\b\d{1,3}(?:[.,]\d{3})+\b/);
  if (thousandMatch) {
    const cleanVnd = thousandMatch[0].replace(/[.,]/g, "");
    return parseFloat(cleanVnd) || 0;
  }

  // 2. Extract number sequence
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

const PROMPT_TEXT = `Bạn là một chuyên gia AI đọc dữ liệu hoá đơn quốc tế (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn, giá tiền và đơn vị tiền tệ tương ứng.

YÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN VÀ ĐỊNH DẠNG:
1. Lấy đúng con số ở cột thành tiền của món ăn.
2. Xử lý linh hoạt định dạng số theo hóa đơn: 
   - Nếu là tiền Việt (VND, đ): Trả về số nguyên (ví dụ: 56000).
   - Nếu là ngoại tệ có số thập phân (USD, $, EUR...): Trả về kiểu số (Number) giữ nguyên phần thập phân nếu có (ví dụ: 10.50 thay vì 1050).
3. TUYỆT ĐỐI KHÔNG ghi thêm ký hiệu tiền tệ, chữ viết hay giải thích vào trường "price".
4. Thêm trường "currency" để ghi nhận đơn vị tiền tệ xuất hiện trên hóa đơn (ví dụ: "VND", "USD", "$").

Tuyệt đối KHÔNG trả về markdown (không dùng \`\`\`json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về một mảng JSON theo format chuẩn xác sau:
[
  {
    "name": "Tiger nâu",
    "price": 56000,
    "currency": "VND"
  },
  {
    "name": "Coke",
    "price": 3.50,
    "currency": "USD"
  }
]
Bỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.`;

function extractJsonItems(cleanText: string): OcrItem[] {
  let itemsJson: Array<{ name?: string; item?: string; description?: string; price?: unknown; amount?: unknown; total?: unknown; currency?: string }> = [];

  try {
    const objMatch = cleanText.match(/\{\s*"items"[\s\S]*\}/);
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (objMatch) {
      const parsedObj = JSON.parse(objMatch[0]);
      if (Array.isArray(parsedObj.items)) itemsJson = parsedObj.items;
    } else if (arrayMatch) {
      itemsJson = JSON.parse(arrayMatch[0]);
    } else {
      const directParse = JSON.parse(cleanText);
      itemsJson = Array.isArray(directParse) ? directParse : (directParse.items || []);
    }
  } catch (e) {
    // Regex fallback for truncated or partially malformed JSON
    const objectMatches = cleanText.match(/\{\s*"(?:name|item)"[\s\S]*?\}/gi);
    if (objectMatches) {
      objectMatches.forEach((objStr) => {
        try {
          const item = JSON.parse(objStr);
          if (item && (item.name || item.price)) itemsJson.push(item);
        } catch (err) {}
      });
    }
  }

  let detectedCurrency: "USD" | "VND" | undefined;
  if (cleanText.includes('"USD"') || cleanText.includes("$") || cleanText.toLowerCase().includes("usd")) {
    detectedCurrency = "USD";
  } else if (cleanText.includes('"VND"') || cleanText.includes("₫") || cleanText.toLowerCase().includes("vnd")) {
    detectedCurrency = "VND";
  }

  if (Array.isArray(itemsJson) && itemsJson.length > 0) {
    return itemsJson.map((it) => {
      const name = String(it.name || it.item || it.description || "Món ăn").trim();
      const rawPrice = it.price ?? it.amount ?? it.total ?? 0;
      const price = parsePriceHelper(rawPrice);
      const currency = it.currency || detectedCurrency || (price > 0 && price < 500 ? "USD" : "VND");
      return { name, price, currency };
    });
  }

  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for safe response handling
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, mimeType = "image/jpeg", apiKey = "" } = (req.body || {}) as OcrRequestBody;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in payload" });
    }

    const pureBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const formattedBase64 = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType};base64,${pureBase64}`;

    const userKey = getCleanKey(apiKey);
    const isGroqKey = userKey.startsWith("gsk_");

    const rawEnvGroq = getCleanKey(process.env.GROQ_API_KEY) || getCleanKey(process.env.VITE_GROQ_KEY);
    const groqKey = isGroqKey ? userKey : (rawEnvGroq.startsWith("gsk_") ? rawEnvGroq : "");

    const rawEnvOpenRouter = getCleanKey(process.env.OPENROUTER_API_KEY) || getCleanKey(process.env.VITE_OPENAI_KEY);
    const validEnvOpenRouter = rawEnvOpenRouter.startsWith("sk-") ? rawEnvOpenRouter : "";
    const openRouterKey = (userKey.startsWith("sk-or-v1-") || userKey.startsWith("sk-"))
      ? userKey
      : validEnvOpenRouter;

    // 1. Try Groq API first if Groq key exists
    if (groqKey && groqKey.startsWith("gsk_")) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.6-27b",
            max_tokens: 4000,
            messages: [
              { role: "system", content: PROMPT_TEXT },
              {
                role: "user",
                content: [
                  { type: "text", text: "Trích xuất danh sách món ăn và giá tiền từ hoá đơn này." },
                  { type: "image_url", image_url: { url: formattedBase64 } },
                ],
              },
            ],
          }),
        });

        if (groqRes.ok) {
          const result = await groqRes.json();
          const rawContent = result.choices?.[0]?.message?.content || "";
          const cleanText = rawContent
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

          const parsedItems = extractJsonItems(cleanText);
          if (parsedItems.length > 0) {
            return res.status(200).json(parsedItems);
          }
        } else {
          const errBody = await groqRes.text();
          console.error("Groq API Non-200 Response:", groqRes.status, errBody);
        }
      } catch (groqErr) {
        console.warn("Groq serverless proxy failed, falling back to OpenRouter...", groqErr);
      }
    }

    // 2. OpenRouter Gemini 2.5 Flash Fallback if OpenRouter Key exists
    if (openRouterKey) {
      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 4000,
          messages: [
            { role: "system", content: PROMPT_TEXT },
            {
              role: "user",
              content: [
                { type: "text", text: "Trích xuất danh sách món ăn và giá tiền từ hoá đơn này." },
                { type: "image_url", image_url: { url: formattedBase64 } },
              ],
            },
          ],
        }),
      });

      if (openRouterRes.ok) {
        const result = await openRouterRes.json();
        const rawContent = result.choices?.[0]?.message?.content || "";
        const cleanText = rawContent
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const parsedItems = extractJsonItems(cleanText);
        if (parsedItems.length > 0) {
          return res.status(200).json(parsedItems);
        }
      } else {
        const errText = await openRouterRes.text();
        console.error("OpenRouter API error response:", errText);
        return res.status(500).json({ error: "Failed to parse receipt from AI models", details: errText });
      }
    }

    return res.status(400).json({ error: "No valid AI API key provided for OCR service." });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Vercel OCR serverless error:", error);
    return res.status(500).json({ error: errorMessage });
  }
}

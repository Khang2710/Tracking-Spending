import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface OcrItem {
  name: string;
  price: number;
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
  if (/^\d+$/.test(strP)) {
    return parseFloat(strP) || 0;
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

  // Handle standard decimal formats like 1,234.56 or 15.5
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

const PROMPT_TEXT = `Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.

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

function extractJsonItems(cleanText: string): OcrItem[] {
  let itemsJson: Array<{ name?: string; item?: string; description?: string; price?: unknown; amount?: unknown; total?: unknown }> = [];
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

  if (Array.isArray(itemsJson) && itemsJson.length > 0) {
    return itemsJson.map((it) => {
      const name = String(it.name || it.item || it.description || "Món ăn").trim();
      const rawPrice = it.price || it.amount || it.total || 0;
      const price = parsePriceHelper(rawPrice);
      return { name, price };
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
            max_tokens: 1000,
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
            .replace(/```json/g, "")
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
          max_tokens: 1000,
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

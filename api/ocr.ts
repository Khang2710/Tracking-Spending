import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface OcrItem {
  name: string;
  price: number;
  currency?: string;
  tax?: number;
  tip?: number;
  serviceCharge?: number;
  discount?: number;
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

const PROMPT_TEXT = `Bạn là một chuyên gia AI đọc dữ liệu hoá đơn quốc tế (Receipt OCR). Dựa vào hình ảnh hoá đơn này (tiếng Việt hoặc tiếng Anh), hãy trích xuất toàn bộ các món ăn, giá tiền, đơn vị tiền tệ, thuế, tip, phí dịch vụ, và giảm giá (discount) nếu có.

QUY TẮC BẮT BUỘC VỀ ĐỊNH DẠNG JSON & TỪ KHÓA (JSON KEYS):
1. BẮT BUỘC DÙNG ĐÚNG CÁC TỪ KHÓA TIẾNG ANH TRONG OBJECT: "name", "price", "currency", "tax", "tip", "serviceCharge", "discount".
   TUYỆT ĐỐI KHÔNG DÙNG TỪ KHÓA TIẾNG VIỆT (KHÔNG dùng "ten_mon", "ten", "gia", "gia_tien", "thanh_tien").

2. ĐƠN VỊ TIỀN TỆ ("currency"):
   - "USD": Nếu là hóa đơn tiền Đô la ($, USD, cents, hoặc số tiền dạng 13.00, 3.50).
   - "VND": Nếu là hóa đơn tiền Việt (₫, VNĐ, đ, k, hoặc số tiền dạng 56.000, 90.000).

3. XỬ LÝ THUẾ (TAX), TIP, PHÍ DỊCH VỤ VÀ GIẢM GIÁ (DISCOUNT):
   - "tax": Tổng tiền thuế trên hóa đơn (ví dụ Resort Tax + Sales Tax: 20.17).
   - "tip": Tiền tip/tiền thưởng (nếu có).
   - "serviceCharge": Phí dịch vụ hoặc phí xử lý (Service Charge, Processing Fee, v.v.). Ví dụ: 44.84.
   - "discount": Số tiền giảm giá hoặc khuyến mãi (ví dụ: 20% Discount -37.80 -> ghi 37.80 dạng số dương tuyệt đối). Nếu không có ghi 0.
   - Nếu là hóa đơn tiền Việt (VND): Đặt tax: 0, tip: 0, serviceCharge: 0, discount: 0 ngoại trừ trường hợp có ghi rõ.

4. GIÁ TIỀN GỐC CỦA MÓN ĂN ("price"):
   - Lấy đúng giá tiền gốc của từng món ăn/uống (ví dụ: South Beach Paella 189.00).
   - TUYỆT ĐỐI KHÔNG đưa tiền Tax, Tip, Service Charge hay dòng Discount (-37.80) vào mảng danh sách món ăn ("items").

Tuyệt đối KHÔNG trả về markdown (không dùng \`\`\`json), KHÔNG giải thích hay thêm văn bản nào khác. CHỈ trả về JSON theo format chuẩn xác sau:
{
  "items": [
    { "name": "Long Island", "price": 32.00, "currency": "USD" },
    { "name": "Flat Water Bottle", "price": 9.00, "currency": "USD" },
    { "name": "South Beach Paella", "price": 189.00, "currency": "USD" },
    { "name": "Caipirinha", "price": 32.00, "currency": "USD" }
  ],
  "tax": 20.17,
  "tip": 0,
  "serviceCharge": 44.84,
  "discount": 37.80,
  "currency": "USD"
}`;

function extractJsonItems(cleanText: string): OcrItem[] {
  let itemsJson: Array<any> = [];
  let extractedTax = 0;
  let extractedTip = 0;
  let extractedServiceCharge = 0;
  let extractedDiscount = 0;

  try {
    const objMatch = cleanText.match(/\{\s*"items"[\s\S]*\}/);
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (objMatch) {
      const parsedObj = JSON.parse(objMatch[0]);
      if (Array.isArray(parsedObj.items)) itemsJson = parsedObj.items;
      else if (Array.isArray(parsedObj.danh_sach)) itemsJson = parsedObj.danh_sach;
      else if (Array.isArray(parsedObj.mon_an)) itemsJson = parsedObj.mon_an;

      if (typeof parsedObj.tax === "number") extractedTax = parsePriceHelper(parsedObj.tax);
      if (typeof parsedObj.tip === "number") extractedTip = parsePriceHelper(parsedObj.tip);
      if (typeof parsedObj.serviceCharge === "number") extractedServiceCharge = parsePriceHelper(parsedObj.serviceCharge);
      else if (typeof parsedObj.service_charge === "number") extractedServiceCharge = parsePriceHelper(parsedObj.service_charge);
      if (typeof parsedObj.discount === "number") extractedDiscount = parsePriceHelper(parsedObj.discount);
    } else if (arrayMatch) {
      itemsJson = JSON.parse(arrayMatch[0]);
    } else {
      const directParse = JSON.parse(cleanText);
      if (Array.isArray(directParse)) {
        itemsJson = directParse;
      } else {
        itemsJson = directParse.items || directParse.danh_sach || directParse.mon_an || [];
        if (typeof directParse.tax === "number") extractedTax = parsePriceHelper(directParse.tax);
        if (typeof directParse.tip === "number") extractedTip = parsePriceHelper(directParse.tip);
        if (typeof directParse.serviceCharge === "number") extractedServiceCharge = parsePriceHelper(directParse.serviceCharge);
        else if (typeof directParse.service_charge === "number") extractedServiceCharge = parsePriceHelper(directParse.service_charge);
        if (typeof directParse.discount === "number") extractedDiscount = parsePriceHelper(directParse.discount);
      }
    }
  } catch (e) {
    // Regex fallback for truncated or partially malformed JSON
    const objectMatches = cleanText.match(/\{\s*"(?:name|item|ten|ten_mon|mon)"[\s\S]*?\}/gi);
    if (objectMatches) {
      objectMatches.forEach((objStr) => {
        try {
          const item = JSON.parse(objStr);
          if (item) itemsJson.push(item);
        } catch (err) {}
      });
    }

    const taxMatch = cleanText.match(/"tax"\s*:\s*([\d.]+)/i);
    if (taxMatch) extractedTax = parsePriceHelper(taxMatch[1]);
    const tipMatch = cleanText.match(/"tip"\s*:\s*([\d.]+)/i);
    if (tipMatch) extractedTip = parsePriceHelper(tipMatch[1]);
    const serviceMatch = cleanText.match(/"service_?charge"\s*:\s*([\d.]+)/i) || cleanText.match(/"processing_?fee"\s*:\s*([\d.]+)/i);
    if (serviceMatch) extractedServiceCharge = parsePriceHelper(serviceMatch[1]);
    const discountMatch = cleanText.match(/"discount"\s*:\s*(-?[\d.]+)/i);
    if (discountMatch) extractedDiscount = parsePriceHelper(discountMatch[1]);
  }

  let detectedCurrency: "USD" | "VND" | undefined;
  if (cleanText.includes('"USD"') || cleanText.includes("$") || cleanText.toLowerCase().includes("usd")) {
    detectedCurrency = "USD";
  } else if (cleanText.includes('"VND"') || cleanText.includes("₫") || cleanText.toLowerCase().includes("vnd") || cleanText.includes("VNĐ")) {
    detectedCurrency = "VND";
  }

  if (Array.isArray(itemsJson) && itemsJson.length > 0) {
    const validItems: OcrItem[] = [];
    itemsJson.forEach((it, idx) => {
      if (!it || typeof it !== "object") return;
      const name = String(
        it.name || it.item || it.description || it.ten_mon || it.ten || it.mon || it.title || "Món ăn"
      ).trim();
      const rawPrice =
        it.price ?? it.amount ?? it.total ?? it.gia ?? it.gia_tien ?? it.thanh_tien ?? it.so_tien ?? it.don_gia ?? 0;

      const price = parsePriceHelper(rawPrice);
      if (name && price > 0 && !name.toLowerCase().includes("discount")) {
        const currency = it.currency || detectedCurrency || (price > 0 && price < 500 ? "USD" : "VND");
        const itemTax = idx === 0 ? (extractedTax || (typeof it.tax === "number" ? parsePriceHelper(it.tax) : 0)) : (typeof it.tax === "number" ? parsePriceHelper(it.tax) : 0);
        const itemTip = idx === 0 ? (extractedTip || (typeof it.tip === "number" ? parsePriceHelper(it.tip) : 0)) : (typeof it.tip === "number" ? parsePriceHelper(it.tip) : 0);
        const itemService = idx === 0 ? (extractedServiceCharge || (typeof it.serviceCharge === "number" ? parsePriceHelper(it.serviceCharge) : 0)) : (typeof it.serviceCharge === "number" ? parsePriceHelper(it.serviceCharge) : 0);
        const itemDiscount = idx === 0 ? (extractedDiscount || (typeof it.discount === "number" ? parsePriceHelper(it.discount) : 0)) : (typeof it.discount === "number" ? parsePriceHelper(it.discount) : 0);

        validItems.push({ name, price, currency, tax: itemTax, tip: itemTip, serviceCharge: itemService, discount: itemDiscount });
      }
    });
    return validItems;
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

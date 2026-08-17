export interface OcrParsedItem {
  name: string;
  price: number;
  currency?: "VND" | "USD" | string;
  tax?: number;
  tip?: number;
  serviceCharge?: number;
  discount?: number;
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

import { parsePriceHelper as utilParsePriceHelper, parseRawReceiptText as utilParseRawReceiptText } from "../utils/ocrParser";

export const parsePriceHelper = utilParsePriceHelper;

export function parseRawReceiptText(rawReceipt: string, defaultName = "Món ăn"): OcrParsedItem[] {
  const items = utilParseRawReceiptText(rawReceipt);
  return items.map((i) => ({ ...i, name: i.name || defaultName }));
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

const OCR_PROMPT = `Bạn là một chuyên gia AI đọc dữ liệu hoá đơn quốc tế (Receipt OCR). Dựa vào hình ảnh hoá đơn này (tiếng Việt hoặc tiếng Anh), hãy trích xuất toàn bộ các món ăn, giá tiền, đơn vị tiền tệ, thuế, tip, phí dịch vụ, và giảm giá (discount) nếu có.

QUY TẮC BẮT BUỘC VỀ ĐỊNH DẠNG JSON & TỪ KHÓA (JSON KEYS):
1. BẮT BUỘC DÙNG ĐÚNG CÁC TỪ KHÓA TIẾNG ANH TRONG OBJECT: "name", "price", "currency", "tax", "tip", "serviceCharge", "discount".
   TUYỆT ĐỐI KHÔNG DÙNG TỪ KHÓA TIẾNG VIỆT.

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

function extractJsonItems(cleanText: string, defaultName: string): OcrParsedItem[] {
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
    const validItems: OcrParsedItem[] = [];
    itemsJson.forEach((it, idx) => {
      if (!it || typeof it !== "object") return;
      const name = String(
        it.name || it.item || it.description || it.ten_mon || it.ten || it.mon || it.title || defaultName
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
        let cleanText = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "");
        if (cleanText.includes("<think>")) {
          const jsonStartIdx = Math.max(cleanText.indexOf("{"), cleanText.indexOf("["));
          if (jsonStartIdx !== -1) {
            cleanText = cleanText.substring(jsonStartIdx);
          } else {
            cleanText = cleanText.replace(/<think>[\s\S]*/gi, "");
          }
        }
        cleanText = cleanText
          .replace(/```json/gi, "")
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

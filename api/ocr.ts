import type { VercelRequest, VercelResponse } from "@vercel/node";

function getCleanKey(key?: string): string {
  if (!key) return "";
  const trimmed = String(key).trim();
  if (trimmed === "undefined" || trimmed === "null" || trimmed === '""' || trimmed === "''") return "";
  return trimmed;
}

function parsePriceHelper(rawPrice: any): number {
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
    const { imageBase64, mimeType = "image/jpeg", apiKey = "" } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in payload" });
    }

    const pureBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const formattedBase64 = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType};base64,${pureBase64}`;

    const userKey = getCleanKey(apiKey);
    const isGroqKey = userKey.startsWith("gsk_");
    const defaultOpenRouterKey = atob("c2stb3ItdjEtNzM0NjY1OWMwMmM1ZDY3Y2M1ZDJkNGNhYmEyNDViNTQxZmU0NDNmMzM1NTJlNjA2NjYwOGZiNGE4ZjY3N2U1NA==").trim();

    const rawEnvGroq = getCleanKey(process.env.GROQ_API_KEY) || getCleanKey(process.env.VITE_GROQ_KEY);
    const groqKey = isGroqKey ? userKey : (rawEnvGroq.startsWith("gsk_") ? rawEnvGroq : "");

    const rawEnvOpenRouter = getCleanKey(process.env.OPENROUTER_API_KEY) || getCleanKey(process.env.VITE_OPENAI_KEY);
    const validEnvOpenRouter = rawEnvOpenRouter.startsWith("sk-") ? rawEnvOpenRouter : "";
    const openRouterKey = (userKey.startsWith("sk-or-v1-") || userKey.startsWith("sk-"))
      ? userKey
      : (validEnvOpenRouter || defaultOpenRouterKey);

    let parsedItems: { name: string; price: number }[] = [];

    const promptText = "Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.\n\nYÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN (PRICE):\n1. Bắt buộc lấy đúng con số ở cột \"Thành tiền\" (Total Amount = Số lượng x Đơn giá).\n2. TUYỆT ĐỐI KHÔNG lấy ở cột \"Đơn giá\" (Unit Price) hay cột \"Số lượng\".\n3. Giữ nguyên dấu chấm hoặc dấu phẩy phân cách hàng nghìn y như trên hoá đơn (ví dụ: \"9.000\" hoặc \"56.000\").\n4. CHỈ TRẢ VỀ DUY NHẤT CON SỐ CỦA THÀNH TIỀN trong trường \"price\". TUYỆT ĐỐI KHÔNG ghi thêm ghi chú, phép tính, số lượng hay chữ viết khác.\n\nTuyệt đối KHÔNG trả về markdown (không dùng ```json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về một mảng JSON theo format chuẩn xác sau:\n[\n  {\n    \"name\": \"Tiger nâu\",\n    \"price\": \"56.000\"\n  },\n  {\n    \"name\": \"Bánh tráng\",\n    \"price\": \"9.000\"\n  }\n]\nBỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.";

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
            model: "llama-3.2-11b-vision-preview",
            max_tokens: 1000,
            messages: [
              { role: "system", content: promptText },
              {
                role: "user",
                content: [{ type: "image_url", image_url: { url: formattedBase64 } }],
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

          let itemsJson: any[] = [];
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
            parsedItems = itemsJson.map((it: any) => {
              const name = String(it.name || it.item || it.description || "Món ăn").trim();
              const rawPrice = it.price || it.amount || it.total || 0;
              const price = parsePriceHelper(rawPrice);
              return { name, price };
            });

            return res.status(200).json(parsedItems);
          }
        }
      } catch (groqErr) {
        console.warn("Groq serverless proxy failed, falling back to OpenRouter...", groqErr);
      }
    }

    // 2. OpenRouter Gemini 2.5 Flash Fallback (max_tokens: 1000)
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
          { role: "system", content: promptText },
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url: formattedBase64 } }],
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

      let itemsJson: any[] = [];
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
        parsedItems = itemsJson.map((it: any) => {
          const name = String(it.name || it.item || it.description || "Món ăn").trim();
          const rawPrice = it.price || it.amount || it.total || 0;
          const price = parsePriceHelper(rawPrice);
          return { name, price };
        });

        return res.status(200).json(parsedItems);
      }
    }

    const errText = await openRouterRes.text();
    console.error("OpenRouter API error response:", errText);
    return res.status(500).json({ error: "Failed to parse receipt from AI models", details: errText });
  } catch (error: any) {
    console.error("Vercel OCR serverless error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}

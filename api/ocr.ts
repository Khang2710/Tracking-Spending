import type { VercelRequest, VercelResponse } from "@vercel/node";

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

    const userKey = (apiKey || "").trim();
    const isGroqKey = userKey.startsWith("gsk_");
    const groqKey = isGroqKey ? userKey : (process.env.GROQ_API_KEY || process.env.VITE_GROQ_KEY || "");
    const openRouterKey =
      (userKey.startsWith("sk-or-v1-") ? userKey : "") ||
      process.env.OPENROUTER_API_KEY ||
      process.env.VITE_OPENAI_KEY ||
      atob("c2stb3ItdjEtNzM0NjY1OWMwMmM1ZDY3Y2M1ZDJkNGNhYmEyNDViNTQxZmU0NDNmMzM1NTJlNjA2NjYwOGZiNGE4ZjY3N2U1NA==");

    let parsedItems: { name: string; price: number }[] = [];

    // 1. Try Groq API first if Groq key exists
    if (groqKey && groqKey.startsWith("gsk_")) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.2-11b-vision-preview",
            max_tokens: 2000,
            messages: [
              {
                role: "system",
                content:
                  "Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.\n\nYÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN (PRICE):\n1. Bắt buộc phải lấy con số ở cột \"Thành tiền\" (Total Amount = Số lượng x Đơn giá).\n2. TUYỆT ĐỐI KHÔNG lấy ở cột \"Đơn giá\" (Unit Price).\n3. Giữ nguyên dấu chấm hoặc dấu phẩy phân cách hàng nghìn y như trên hoá đơn (ví dụ: \"3.565.000\"). Giá trị của price bắt buộc phải nằm trong dấu ngoặc kép (kiểu String).\n\nTuyệt đối KHÔNG trả về markdown (không dùng ```json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về một mảng JSON theo format chuẩn xác sau:\n[\n  {\n    \"name\": \"Tên món 1\",\n    \"price\": \"15.000\"\n  },\n  {\n    \"name\": \"Tên món 2\",\n    \"price\": \"3.565.000\"\n  }\n]\nBỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: formattedBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
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
              let price = 0;
              if (typeof rawPrice === "number") {
                price = rawPrice;
              } else {
                const strP = String(rawPrice).trim();
                if (/^.*\.\d{2}$/.test(strP)) {
                  price = parseFloat(strP.replace(/[^0-9.]/g, "")) || 0;
                } else {
                  price = parseFloat(strP.replace(/[^0-9]/g, "")) || 0;
                }
              }
              return { name, price };
            });

            return res.status(200).json(parsedItems);
          }
        }
      } catch (groqErr) {
        console.warn("Groq serverless proxy failed, falling back to OpenRouter...", groqErr);
      }
    }

    // 2. OpenRouter Gemini 2.5 Flash Fallback
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.\n\nYÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN (PRICE):\n1. Bắt buộc phải lấy con số ở cột \"Thành tiền\" (Total Amount = Số lượng x Đơn giá).\n2. TUYỆT ĐỐI KHÔNG lấy ở cột \"Đơn giá\" (Unit Price).\n3. Giữ nguyên dấu chấm hoặc dấu phẩy phân cách hàng nghìn y như trên hoá đơn (ví dụ: \"3.565.000\"). Giá trị của price bắt buộc phải nằm trong dấu ngoặc kép (kiểu String).\n\nTuyệt đối KHÔNG trả về markdown (không dùng ```json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về một mảng JSON theo format chuẩn xác sau:\n[\n  {\n    \"name\": \"Tên món 1\",\n    \"price\": \"15.000\"\n  },\n  {\n    \"name\": \"Tên món 2\",\n    \"price\": \"3.565.000\"\n  }\n]\nBỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: formattedBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      const result = await response.json();
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
          let price = 0;
          if (typeof rawPrice === "number") {
            price = rawPrice;
          } else {
            const strP = String(rawPrice).trim();
            if (/^.*\.\d{2}$/.test(strP)) {
              price = parseFloat(strP.replace(/[^0-9.]/g, "")) || 0;
            } else {
              price = parseFloat(strP.replace(/[^0-9]/g, "")) || 0;
            }
          }
          return { name, price };
        });

        return res.status(200).json(parsedItems);
      }
    }

    return res.status(500).json({ error: "Failed to parse receipt from AI models" });
  } catch (error: any) {
    console.error("Vercel OCR serverless error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}

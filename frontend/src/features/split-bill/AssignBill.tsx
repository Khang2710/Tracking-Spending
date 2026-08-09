import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, Receipt, Sparkles, Check, Trash2, ArrowUpRight, Camera, Loader2, Key, ExternalLink, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C, Card } from "../../App";

interface SplitItem {
  id: number;
  name: string;
  price: number;
  consumers: string[];
}

import { FriendBalanceItem, SavedBill } from "./SplitScreen";
import { Transaction } from "../../App";
import { compressImage } from "../../utils/imageCompressor";
import { useCurrency } from "../../context/CurrencyContext";

export default function AssignBill({
  friends,
  onAddFriend,
  onRemoveFriend,
  balances,
  setBalances,
  userName,
  setBills,
  onAddTransaction,
}: AssignBillProps) {
  const { t } = useTranslation();
  const { formatCurrency, currency } = useCurrency();
  const [items, setItems] = useState<SplitItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [taxPercent, setTaxPercent] = useState<number>(10);
  const [tip, setTip] = useState<number>(0);

  const [newFriendName, setNewFriendName] = useState("");
  const [rawReceipt, setRawReceipt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrLoadingText, setOcrLoadingText] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => (import.meta.env.VITE_GROQ_KEY as string) || (import.meta.env.VITE_OPENAI_KEY as string) || localStorage.getItem("groq_api_key") || localStorage.getItem("openai_api_key") || localStorage.getItem("gemini_api_key") || "");
  const [hasApiKey, setHasApiKey] = useState(() => !!((import.meta.env.VITE_GROQ_KEY as string) || (import.meta.env.VITE_OPENAI_KEY as string) || localStorage.getItem("groq_api_key") || localStorage.getItem("openai_api_key") || localStorage.getItem("gemini_api_key")));
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [billTitle, setBillTitle] = useState("");

  const myName = userName || t("common.you");
  const [payer, setPayer] = useState("");
  const activePayer = payer || myName;

  const handleExtractAI = () => {
    if (!rawReceipt.trim()) return;
    setIsExtracting(true);
    setOcrLoadingText(t("split.aiReadingReceipt"));

    setTimeout(() => {
      const lines = rawReceipt.split("\n");
      const parsedItems: SplitItem[] = [];
      let nextId = Math.max(0, ...items.map((i) => i.id)) + 1;

      lines.forEach((line) => {
        const match = line.match(/(.*?)\$?(\d+(?:\.\d{1,2})?)\s*$/);
        if (match) {
          const name = match[1].trim().replace(/^[\d\s.\-*]+/, "");
          const price = parseFloat(match[2]);
          if (name && !isNaN(price)) {
            parsedItems.push({
              id: nextId++,
              name,
              price,
              consumers: [],
            });
          }
        }
      });

      if (parsedItems.length > 0) {
        setItems((prev) => [...prev, ...parsedItems]);
        setRawReceipt("");
      }
      setIsExtracting(false);
      setOcrLoadingText("");
      setOcrProgress(0);
    }, 1200);
  };

  // Option 5: Animated Real-time Progress Bar & Status Tracker
  useEffect(() => {
    if (!isExtracting) {
      setOcrProgress(0);
      setOcrLoadingText("");
      return;
    }
    setOcrProgress(15);
    setOcrLoadingText("Đang nén & tối ưu hình ảnh...");

    const t1 = setTimeout(() => {
      setOcrProgress(45);
      setOcrLoadingText("Đang kết nối AI siêu tốc...");
    }, 300);

    const t2 = setTimeout(() => {
      setOcrProgress(80);
      setOcrLoadingText("AI đang bóc tách món ăn & giá tiền...");
    }, 800);

    const t3 = setTimeout(() => {
      setOcrProgress(95);
      setOcrLoadingText("Đang hoàn tất phân tích hóa đơn...");
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isExtracting]);

  // Prompt 37: 1. Compress image via canvas before sending (600px width for max speed)
  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setOcrLoadingText("Đang nén & đọc hoá đơn...");

    try {
      let base64Data = "";
      try {
        base64Data = await compressImage(file, 600, 0.55);
      } catch (compressErr) {
        console.warn("Compress failed, fallback to FileReader:", compressErr);
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      if (base64Data) {
        await processReceiptImage(base64Data);
      }
    } catch (err) {
      console.error("Image processing error:", err);
    } finally {
      setIsExtracting(false);
      setOcrLoadingText("");
      setOcrProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const processReceiptImage = async (base64Data: string) => {
    try {
      const mimeType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";")) || "image/jpeg";
      const pureBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const formattedBase64 = base64Data.startsWith("data:")
        ? base64Data
        : `data:${mimeType};base64,${pureBase64}`;

      let parsedItems: { name: string; price: number }[] = [];
      const openAiApiKey =
        (import.meta.env.VITE_GROQ_KEY as string) ||
        (import.meta.env.VITE_OPENAI_KEY as string) ||
        localStorage.getItem("groq_api_key") ||
        localStorage.getItem("openai_api_key") ||
        localStorage.getItem("gemini_api_key") ||
        atob("c2stb3ItdjEtNzM0NjY1OWMwMmM1ZDY3Y2M1ZDJkNGNhYmEyNDViNTQxZmU0NDNmMzM1NTJlNjA2NjYwOGZiNGE4ZjY3N2U1NA==");

      const key = openAiApiKey.trim();
      const isGroq = key.startsWith("gsk_");
      const isOpenRouter = key.startsWith("sk-or-v1-");

      const apiUrl = isOpenRouter
        ? "https://openrouter.ai/api/v1/chat/completions"
        : isGroq
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      const modelName = isOpenRouter
        ? "google/gemini-2.5-flash"
        : isGroq
        ? "llama-3.2-11b-vision-preview"
        : "gpt-4o";

      // 1. Same-Origin Vercel Serverless Proxy FIRST (Bypasses CORS completely on iOS Safari / Chrome Android)
      try {
        const res = await fetchWithTimeout(
          "/api/ocr",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: pureBase64,
              mimeType,
              apiKey: openAiApiKey.trim(),
            }),
          },
          12000
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            parsedItems = data;
          }
        }
      } catch (proxyErr) {
        console.warn("Vercel Serverless /api/ocr proxy failed, attempting client fallback...", proxyErr);
      }

      // 2. Client-side direct REST API fallback if serverless proxy returned no items
      if (parsedItems.length === 0 && key) {
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
            },
            10000
          );

          if (response.ok) {
            const result = await response.json();
            const rawContent = result.choices?.[0]?.message?.content || "";
            const cleanText = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json/g, "").replace(/```/g, "").trim();

            try {
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
                  const name = String(it.name || it.item || it.description || t("common.unnamed")).trim();
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
              }
            } catch (jsonErr) {
              console.error("Failed to parse OCR JSON:", jsonErr);
            }
          }
        } catch (clientErr) {
          console.warn("Client-side direct OCR failed or timed out:", clientErr);
        }
      }

      // 2. Fallback to Spring Boot Backend (/api/ocr/scan) ONLY if client direct call didn't extract items
      if (parsedItems.length === 0) {
        try {
          const backendHost = import.meta.env.VITE_BACKEND_URL || "https://tracking-spending-backend.onrender.com";
          const res = await fetchWithTimeout(
            `${backendHost}/api/ocr/scan`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: pureBase64, mimeType }),
            },
            10000
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              parsedItems = data;
            }
          }
        } catch (err) {
          console.error("Backend OCR error/timeout:", err);
        }
      }

      // 4. Update food items state with parsed items from receipt
      if (parsedItems.length > 0) {
        let nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
        const newSplitItems: SplitItem[] = parsedItems.map((item) => ({
          id: nextId++,
          name: item.name,
          price: typeof item.price === "number" ? item.price : parseFloat(item.price as any) || 0,
          consumers: [],
        }));
        setItems((prev) => [...prev, ...newSplitItems]);
      }
    } catch (e) {
      console.error("OCR processing exception:", e);
    } finally {
      setIsExtracting(false);
      setOcrLoadingText("");
      setOcrProgress(0);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return;

    const nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    setItems((prev) => [
      ...prev,
      { id: nextId, name: newItemName.trim(), price, consumers: [] },
    ]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFriendName.trim();
    if (!name || friends.includes(name)) return;
    onAddFriend(name);
    setNewFriendName("");
  };

  const handleRemoveFriend = (name: string) => {
    onRemoveFriend(name);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        consumers: item.consumers.filter((c) => c !== name),
      }))
    );
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleToggleConsumer = (friendName: string) => {
    if (selectedItemId === null) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItemId) return item;
        const exists = item.consumers.includes(friendName);
        return {
          ...item,
          consumers: exists
            ? item.consumers.filter((c) => c !== friendName)
            : [...item.consumers, friendName],
        };
      })
    );
  };

  const allParticipants = [myName, ...friends];
  const numPeople = allParticipants.length;
  const itemShares: Record<string, number> = {};
  allParticipants.forEach((p) => {
    itemShares[p] = 0;
  });

  // Prompt 36: 1. Calculate unassigned / shared items total
  const unassignedItems = items.filter((item) => item.consumers.length === 0);
  const totalSharedAmount = unassignedItems.reduce((sum, item) => sum + item.price, 0);

  // Prompt 36: 2. Calculate shared share per person
  const sharedAmountPerPerson = numPeople > 0 ? totalSharedAmount / numPeople : 0;

  // Prompt 36: 3. Calculate assigned item costs per person
  items.forEach((item) => {
    if (item.consumers.length > 0) {
      const pricePerPerson = item.price / item.consumers.length;
      item.consumers.forEach((c) => {
        if (itemShares[c] !== undefined) {
          itemShares[c] += pricePerPerson;
        }
      });
    }
  });

  const tipShare = numPeople > 0 ? tip / numPeople : 0;
  const debts = allParticipants.map((p) => {
    const assignedItemCost = itemShares[p] || 0;
    const personalItemCost = assignedItemCost + sharedAmountPerPerson;
    const personalTax = personalItemCost * (taxPercent / 100);
    const totalDue = personalItemCost + personalTax + tipShare;
    return {
      name: p,
      itemCost: personalItemCost,
      tax: personalTax,
      total: Math.round(totalDue * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const totalTax = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + totalTax + tip;

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };

  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSaveAndSplit = () => {
    if (items.length === 0) return;
    const finalTitle = billTitle.trim() || `Bill Split: ${items.length} items`;
    
    setBalances((prev) => {
      const existingNames = new Set(prev.map((x) => x.name.normalize("NFC").trim().toLowerCase()));
      
      let updatedBalances = [...prev];
      friends.forEach((f) => {
        const normF = f.normalize("NFC").trim();
        if (!existingNames.has(normF.toLowerCase())) {
          updatedBalances.push({
            id: Date.now() + Math.random(),
            name: normF,
            balance: 0,
            history: [],
          });
        }
      });

      return updatedBalances.map((fb) => {
        const fbNormName = fb.name.normalize("NFC").trim().toLowerCase();
        const d = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === fbNormName);
        if (!d) return fb;

        let diff = 0;
        let desc = "";
        let isLent = false;

        const activePayerNorm = activePayer.normalize("NFC").trim().toLowerCase();
        const myNameNorm = myName.normalize("NFC").trim().toLowerCase();

        if (activePayerNorm === myNameNorm) {
          diff = d.total;
          desc = `${finalTitle} (You paid)`;
          isLent = true;
        } else if (activePayerNorm === fbNormName) {
          const myShare = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm)?.total || 0;
          diff = -myShare;
          desc = `${finalTitle} (${fb.name} paid)`;
          isLent = false;
        } else {
          return fb;
        }

        if (diff === 0) return fb;

        const newRecord = {
          id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
          date: "Today",
          description: desc,
          amount: Math.abs(diff),
          isLent,
          isSettled: false,
        };

        return {
          ...fb,
          balance: Math.round((fb.balance + diff) * 100) / 100,
          history: [newRecord, ...fb.history],
        };
      });
    });

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = `Today • ${nowTime}`;

    const newSavedBill = {
      id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
      title: finalTitle,
      date: formattedDate,
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        consumers: i.consumers,
      })),
      taxPercent,
      tip,
      payer: activePayer,
      debts: debts.map((d) => ({
        name: d.name,
        total: d.total,
      })),
      grandTotal,
    };

    setBills((prev) => [newSavedBill, ...prev]);

    // ─── Auto-generate personal transaction for Current User ───
    const myNameNorm = myName.normalize("NFC").trim().toLowerCase();
    const myDebt = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm);
    const currentUserShare = myDebt ? myDebt.total : 0;

    if (currentUserShare > 0 && onAddTransaction) {
      onAddTransaction(
        {
          name: `Chia bill: ${finalTitle}`,
          amount: -currentUserShare,
          category: "Food",
          date: formattedDate,
          walletId: 1,
        }
      );
    }

    setShowSuccessToast(true);
    setItems([]);
    setBillTitle("");
    setSelectedItemId(null);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <>
      <div className="px-5 md:px-0 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-10">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold text-white flex items-center gap-2 font-sans">
                <Sparkles size={16} color={C.gold} /> {t("split.ocrTitle")}
              </h3>
            </div>
            <p className="text-xs text-tm mb-4 font-sans leading-relaxed">
              {t("split.ocrHint")}
            </p>
            <textarea
              rows={4}
              placeholder={t("split.ocrPlaceholder")}
              value={rawReceipt}
              onChange={(e) => setRawReceipt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold resize-none"
              style={{ borderColor: C.border }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              {/* Hidden file input for Camera Capture / File select */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileCapture}
                className="hidden"
              />

              {/* Camera OCR Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:bg-surf/80 border text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ borderColor: C.border, background: C.surf + "50", color: C.white }}
              >
                <Camera size={15} color={C.gold} />
                <span>{t("split.cameraOcrBtn")}</span>
              </button>

              {/* Text Extract Button */}
              <button
                type="button"
                onClick={handleExtractAI}
                disabled={isExtracting || !rawReceipt.trim()}
                className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                style={{ background: C.gold, color: C.bg }}
              >
                {isExtracting ? (
                  <span className="w-4 h-4 border-2 border-solid rounded-full animate-spin border-bg border-t-transparent" style={{ borderColor: C.bg }} />
                ) : (
                  <>
                    <Receipt size={14} /> {t("split.ocrBtn")}
                  </>
                )}
              </button>
            </div>

            {/* Option 5: Dynamic Real-time Progress Bar & Status Tracker */}
            {isExtracting && (
              <div className="mt-4 p-3.5 rounded-xl border flex flex-col gap-2 transition-all" style={{ borderColor: C.gold + "50", background: C.surf + "bb" }}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2" style={{ color: C.gold }}>
                    <Sparkles size={14} className="animate-spin" />
                    {ocrLoadingText}
                  </span>
                  <span style={{ color: C.gold }}>{ocrProgress}%</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: C.bg }}>
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${ocrProgress}%`,
                      background: `linear-gradient(90deg, ${C.gold} 0%, #F59E0B 100%)`,
                      boxShadow: `0 0 8px ${C.gold}80`,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white font-sans">{t("split.selectFoodTitle")}</h3>
              <span className="text-xs text-tm font-sans">{t("split.selectFoodSubtitle")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.length === 0 ? (
                <div
                  className="sm:col-span-2 flex flex-col items-center justify-center p-8 text-center text-sm rounded-2xl border"
                  style={{ color: C.tm, background: C.card, borderColor: C.border }}
                >
                  <Receipt size={32} color={C.tm} className="opacity-50 mb-3" />
                  {t("split.noItems")}
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="cursor-pointer relative overflow-hidden"
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      <Card
                        className="p-4 transition-all h-full flex flex-col justify-between"
                        style={{
                          borderColor: isSelected ? C.gold : C.border,
                          boxShadow: isSelected ? `0 0 12px ${C.gold}1a` : "none",
                          background: isSelected ? C.surf + "bb" : C.card,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4 font-sans">
                          <div className="min-w-0">
                            <h4 className="font-bold text-[15px] text-white truncate">{item.name}</h4>
                            <p className="text-xs text-tm mt-0.5" style={{ color: C.gold }}>
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10 cursor-pointer border-0 bg-transparent"
                          >
                            <Trash2 size={14} className="text-red-400 opacity-60 hover:opacity-100" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 min-h-[22px] font-sans">
                          {item.consumers.length === 0 ? null : (
                            item.consumers.map((c) => (
                              <span
                                key={c}
                                className="text-[10px] px-2 py-0.5 font-bold rounded-lg"
                                style={{ background: C.gold + "15", color: C.gold }}
                              >
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </Card>

                      {isSelected && (
                        <div
                          className="absolute right-3 top-3 w-4 h-4 rounded-full flex items-center justify-center bg-gold text-bg"
                          style={{ color: C.bg }}
                        >
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleAddItem} className="flex gap-2.5 font-sans mt-1">
              <input
                type="text"
                required
                placeholder={t("split.dishPlaceholder")}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <input
                type="number"
                step="0.01"
                required
                placeholder={t("split.pricePlaceholder")}
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-24 px-4 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <button
                type="submit"
                className="px-4 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:brightness-110 border-0"
                style={{ background: C.gold, color: C.bg }}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-4 mt-2 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white">{t("split.friendsAvatars")}</h3>
              {selectedItem ? (
                <span className="text-xs text-gold flex items-center gap-1">
                  Assigning to: <span className="font-bold underline">{selectedItem.name}</span>
                </span>
              ) : (
                <span className="text-xs text-red-400">{t("split.selectItemHint")}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 p-5 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
              {allParticipants.map((friend) => {
                const isAssigned = selectedItem ? selectedItem.consumers.includes(friend) : false;
                const initials = getInitials(friend);
                const isMe = friend === myName;
                return (
                  <div key={friend} className="flex flex-col items-center gap-1.5 group relative">
                    <motion.button
                      type="button"
                      onClick={() => handleToggleConsumer(friend)}
                      disabled={!selectedItem}
                      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm transition-all relative border-2 border-solid cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: isAssigned
                          ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`
                          : C.surf,
                        borderColor: isAssigned ? C.gold : C.border,
                        color: isAssigned ? C.bg : C.white,
                      }}
                      whileHover={{ scale: selectedItem ? 1.06 : 1 }}
                      whileTap={{ scale: selectedItem ? 0.94 : 1 }}
                    >
                      {initials}
                      {isAssigned && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-solid bg-green-500 text-white"
                          style={{ borderColor: C.bg }}
                        >
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </motion.button>
                    <span className="text-xs font-semibold text-white group-hover:text-gold transition-colors">
                      {isMe ? `${friend} (${t("common.you")})` : friend}
                    </span>
                    
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/20 text-red-400 items-center justify-center hidden group-hover:flex hover:bg-red-500 hover:text-white border border-red-500/30 font-sans cursor-pointer p-0"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              <form onSubmit={handleAddFriend} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder={`+ ${t("split.addFriend")}`}
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-28 px-3 py-2 rounded-full border text-xs text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 font-sans">
          <Card className="p-4 md:p-6 sticky top-24">
            <h3 className="text-[17px] font-bold text-white mb-4">{t("split.calculationsShare")}</h3>

            {/* Bill Title Input */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-semibold text-tm pl-0.5">{t("split.billTitle")}</label>
              <input
                type="text"
                placeholder={t("split.billTitlePlaceholder")}
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-semibold text-tm pl-0.5">{t("split.whoPaid")}</label>
              <select
                value={activePayer}
                onChange={(e) => setPayer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold cursor-pointer"
                style={{ borderColor: C.border }}
              >
                {allParticipants.map((p) => (
                  <option key={p} value={p}>
                    {p === myName ? `${p} (${t("common.you")})` : p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 font-sans">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-tm pl-0.5">{t("split.tax")}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={taxPercent === 0 ? "" : taxPercent}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                    setTaxPercent(raw === "" ? 0 : parseFloat(raw) || 0);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-tm pl-0.5">
                  {t("split.tip", { symbol: currency === "VND" ? "₫" : "$" })}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={tip === 0 ? "" : tip}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");
                    setTip(raw === "" ? 0 : parseFloat(raw) || 0);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3.5 mb-6">
              <h4 className="text-xs font-semibold text-tm pl-0.5 mb-1">{t("split.debtsDistribution")}</h4>
              {debts.map((debt) => (
                <div key={debt.name} className="flex items-center justify-between text-sm py-1.5 border-b border-solid" style={{ borderColor: C.border + "50" }}>
                  <div>
                    <p className="font-semibold text-white">{debt.name}</p>
                    <p className="text-[10px] text-tm mt-0.5">
                      {t("split.items")}: {formatCurrency(debt.itemCost)} + {t("split.taxLabel")}: {formatCurrency(debt.tax)}
                    </p>
                  </div>
                  <span className="font-bold text-gold text-[15px]">{formatCurrency(debt.total)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl flex flex-col gap-2.5 mb-4" style={{ background: C.surf + "40" }}>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.itemsSubtotal")}:</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.taxLabel")} ({taxPercent}%):</span>
                <span className="font-semibold text-white">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.flatTip")}:</span>
                <span className="font-semibold text-white">{formatCurrency(tip)}</span>
              </div>
              <div className="h-px bg-border my-1.5" style={{ background: C.border }} />
              <div className="flex justify-between text-sm font-bold text-white">
                <span className="flex items-center gap-1"><ArrowUpRight size={14} color={C.gold} /> {t("split.totalBill")}:</span>
                <span className="text-gold text-[16px]">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {items.length > 0 && friends.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAndSplit}
                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-sm shadow-md"
                style={{ background: C.gold, color: C.bg }}
              >
                <Check size={16} strokeWidth={2.5} />
                Save & Split Bill
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* Premium Success Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div
              className="p-5 rounded-2xl border shadow-2xl flex flex-col items-center text-center gap-3 backdrop-blur-md"
              style={{
                background: `${C.card}ee`,
                borderColor: `${C.gold}50`,
                boxShadow: `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px ${C.gold}15`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r"
                style={{
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
                }}
              >
                <Check size={24} className="text-[#0e0f11]" strokeWidth={3} />
              </div>
              <div>
                <h4 className="text-white font-bold text-base font-sans">Bill Split Successfully!</h4>
                <p className="text-tm text-xs mt-1 font-sans leading-normal">
                  The split has been calculated and updated in your Running Balances list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessToast(false)}
                className="px-6 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 cursor-pointer border-0 mt-1"
                style={{ background: C.gold, color: C.bg }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen AI Reading Receipt Overlay Spinner */}
      <AnimatePresence>
        {isExtracting && (
          <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col items-center gap-4 bg-[#141416] shadow-2xl text-center max-w-xs mx-auto"
            >
              <Loader2 size={40} color={C.gold} className="animate-spin" />
              <div>
                <p className="text-base font-bold text-white font-sans">{ocrLoadingText || t("split.aiReadingReceipt")}</p>
                <span className="text-xs text-tm font-sans mt-1 block">{t("split.aiReadingHint")}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExtracting(false);
                  setOcrLoadingText("");
                  setOcrProgress(0);
                }}
                className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-tm hover:text-white transition-all cursor-pointer"
              >
                Hủy / Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

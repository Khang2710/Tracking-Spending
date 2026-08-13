import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Camera, Receipt, Loader2, Key, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C } from "../../../App";
import { compressImage } from "../../../utils/imageCompressor";
import { parseRawReceiptText } from "../../../utils/ocrParser";
import { processReceiptImage, ExtractedItem } from "../../../services/ocrService";

interface ReceiptOCRModalProps {
  onItemsExtracted: (items: ExtractedItem[]) => void;
}

export const ReceiptOCRModal: React.FC<ReceiptOCRModalProps> = React.memo(({ onItemsExtracted }) => {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [rawReceipt, setRawReceipt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrLoadingText, setOcrLoadingText] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);

  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(
    () =>
      (import.meta.env.VITE_GROQ_KEY as string) ||
      (import.meta.env.VITE_OPENAI_KEY as string) ||
      localStorage.getItem("groq_api_key") ||
      localStorage.getItem("openai_api_key") ||
      localStorage.getItem("gemini_api_key") ||
      ""
  );

  const [hasApiKey, setHasApiKey] = useState(
    () =>
      !!(
        (import.meta.env.VITE_GROQ_KEY as string) ||
        (import.meta.env.VITE_OPENAI_KEY as string) ||
        localStorage.getItem("groq_api_key") ||
        localStorage.getItem("openai_api_key") ||
        localStorage.getItem("gemini_api_key")
      )
  );

  // Animated Real-time Progress Bar & Status Tracker (Isolated to this component)
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

  const handleExtractText = () => {
    if (!rawReceipt.trim()) return;
    setIsExtracting(true);
    setOcrLoadingText(t("split.aiReadingReceipt"));

    setTimeout(() => {
      const parsedItems = parseRawReceiptText(rawReceipt);
      if (parsedItems.length > 0) {
        onItemsExtracted(parsedItems);
        setRawReceipt("");
      }
      setIsExtracting(false);
      setOcrLoadingText("");
      setOcrProgress(0);
    }, 800);
  };

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
        const userKey =
          (import.meta.env.VITE_GROQ_KEY as string) ||
          (import.meta.env.VITE_OPENAI_KEY as string) ||
          localStorage.getItem("groq_api_key") ||
          localStorage.getItem("openai_api_key") ||
          localStorage.getItem("gemini_api_key") ||
          "";

        const extracted = await processReceiptImage(base64Data, userKey, t("common.unnamed"));
        if (extracted.length > 0) {
          onItemsExtracted(extracted);
        } else {
          alert("AI chưa trích xuất được món ăn nào từ ảnh chụp. Bạn vui lòng chụp vuông góc, rõ nét hơn hoặc dùng tính năng Dán văn bản.");
        }
      }
    } catch (err) {
      console.error("Image processing error:", err);
      alert("Đã xảy ra lỗi trong quá trình đọc ảnh hoá đơn. Vui lòng thử lại.");
    } finally {
      setIsExtracting(false);
      setOcrLoadingText("");
      setOcrProgress(0);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed.startsWith("gsk_")) {
      localStorage.setItem("groq_api_key", trimmed);
    } else if (trimmed.startsWith("sk-or-v1-")) {
      localStorage.setItem("gemini_api_key", trimmed);
    } else if (trimmed.startsWith("sk-")) {
      localStorage.setItem("openai_api_key", trimmed);
    } else if (trimmed) {
      localStorage.setItem("groq_api_key", trimmed);
    } else {
      localStorage.removeItem("groq_api_key");
      localStorage.removeItem("openai_api_key");
      localStorage.removeItem("gemini_api_key");
    }
    setHasApiKey(!!trimmed);
    setIsKeyModalOpen(false);
  };

  return (
    <>
      {/* Sleek Compact Banner Card matching reference UI */}
      <div className="p-4 md:p-5 rounded-2xl border bg-[#1A1A1E] border-white/10 flex flex-col gap-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#C9A45B]/15 border border-[#C9A45B]/25 flex items-center justify-center shrink-0">
              <Sparkles size={18} color={C.gold} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans tracking-tight">
                {t("split.ocrTitle")}
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-0.5 leading-relaxed">
                {t("split.ocrHint")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {/* Native File Input (Triggers iOS Action Sheet: Photo Library / Take Photo / Choose File) */}
            <input
              type="file"
              accept="image/*"
              ref={cameraInputRef}
              onChange={handleFileCapture}
              className="hidden"
            />

            {/* Main Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isExtracting}
              className="px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-xs text-[#0F0F10] shadow-md disabled:opacity-40"
              style={{ background: C.gold }}
            >
              <Camera size={15} className="text-[#0F0F10]" />
              <span>{t("split.cameraOcrBtn")}</span>
            </button>

            {/* Toggle Paste Text Area */}
            <button
              type="button"
              onClick={() => setShowPasteArea((prev) => !prev)}
              className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs"
              title="Dán văn bản thủ công"
            >
              {showPasteArea ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Optional Collapsible Manual Paste Textarea */}
        <AnimatePresence>
          {showPasteArea && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 flex flex-col gap-2"
            >
              <textarea
                rows={3}
                placeholder={t("split.ocrPlaceholder")}
                value={rawReceipt}
                onChange={(e) => setRawReceipt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm text-white bg-[#141416] border-zinc-800 outline-none focus:border-gold resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExtractText}
                  disabled={isExtracting || !rawReceipt.trim()}
                  className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-xs bg-zinc-800 text-white disabled:opacity-40"
                >
                  <Receipt size={14} /> {t("split.ocrBtn")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Progress Bar & Status Tracker */}
        {isExtracting && (
          <div className="mt-2 p-3.5 rounded-xl border border-[#C9A45B]/30 bg-[#141416] flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-[#C9A45B]">
                <Sparkles size={14} className="animate-spin" />
                {ocrLoadingText}
              </span>
              <span className="text-[#C9A45B]">{ocrProgress}%</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden relative bg-zinc-900">
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
      </div>

      {/* Fullscreen AI Reading Receipt Overlay Spinner */}
      <AnimatePresence>
        {isExtracting && (
          <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col items-center gap-4 bg-[#141416] shadow-2xl text-center max-w-xs mx-auto relative overflow-hidden"
            >
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: "250%" }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-gold/20 to-transparent pointer-events-none"
              />
              <div className="relative">
                <Loader2 size={40} color={C.gold} className="animate-spin" />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full bg-gold/20 blur-md -z-10"
                />
              </div>
              <div>
                <p className="text-base font-bold text-white font-sans">{ocrLoadingText || t("split.aiReadingReceipt")}</p>
                <span className="text-xs text-tm font-sans mt-1 block animate-pulse">{t("split.aiReadingHint")}</span>
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

      {/* API Key Modal Dialog */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border bg-[#1A1A1E] border-white/10 text-white shadow-2xl relative"
            >
              <div className="flex items-center gap-2 mb-3">
                <Key color={C.gold} size={20} />
                <h3 className="text-lg font-bold font-sans">Cấu hình API Key AI Custom</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4 font-sans leading-relaxed">
                Mặc định hệ thống tự kết nối Vercel Proxy. Nếu bạn có API Key cá nhân (Groq / OpenRouter / OpenAI), nhập tại đây để ưu tiên dùng key của bạn.
              </p>
              <input
                type="password"
                placeholder="Nhập Groq API Key (gsk_...) hoặc OpenRouter Key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-800 text-sm text-white bg-[#141416] outline-none focus:border-gold mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 cursor-pointer border-0 bg-[#C9A45B] text-[#0F0F10]"
                >
                  Lưu Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

ReceiptOCRModal.displayName = "ReceiptOCRModal";

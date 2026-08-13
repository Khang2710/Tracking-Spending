import React, { useRef, useState } from "react";
import { Sparkles, Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { C } from "../../App";
import { processReceiptOcr, OcrParsedItem } from "../../services/ocrService";
import { compressImage } from "../../utils/imageCompressor";

interface OcrScannerCardProps {
  userApiKey?: string;
  onItemsParsed: (items: OcrParsedItem[]) => void;
}

export function OcrScannerCard({ userApiKey, onItemsParsed }: OcrScannerCardProps) {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLoadingText, setOcrLoadingText] = useState("");

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExtracting(false);
    setOcrProgress(0);
    setOcrLoadingText("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsExtracting(true);
    setOcrProgress(15);
    setOcrLoadingText(t("split.compressingImage", "Compressing image..."));

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

      if (signal.aborted) return;

      if (base64Data) {
        const mimeType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";")) || "image/jpeg";
        const pureBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
        const formattedBase64 = base64Data.startsWith("data:")
          ? base64Data
          : `data:${mimeType};base64,${pureBase64}`;

        setOcrProgress(30);
        setOcrLoadingText(t("split.aiAnalyzing", "Analyzing receipt..."));

        const items = await processReceiptOcr({
          pureBase64,
          mimeType,
          formattedBase64,
          userApiKey,
          signal,
          defaultNameLabel: t("common.unnamed", "Item"),
          onProgress: (percent, statusText) => {
            if (!signal.aborted) {
              setOcrProgress(percent);
              if (statusText === "AI Proxy OCR") {
                setOcrLoadingText(t("split.aiProxyScan", "Connecting to high-speed AI..."));
              } else if (statusText === "Direct AI Fallback") {
                setOcrLoadingText(t("split.aiDirectScan", "AI is extracting dishes & prices..."));
              } else if (statusText === "Backend OCR") {
                setOcrLoadingText(t("split.aiBackendScan", "Finalizing receipt analysis..."));
              } else {
                setOcrLoadingText(statusText);
              }
            }
          },
        });

        if (!signal.aborted && items && items.length > 0) {
          onItemsParsed(items);
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal.aborted) {
        console.log("OCR scan cancelled by user.");
      } else {
        console.error("OCR Scan Error:", err);
      }
    } finally {
      if (!signal.aborted) {
        setIsExtracting(false);
        setOcrProgress(0);
        setOcrLoadingText("");
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (galleryInputRef.current) galleryInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <div
        className="p-4 rounded-2xl border flex flex-col gap-3 relative overflow-hidden transition-all font-sans"
        style={{
          background: `linear-gradient(135deg, ${C.gold}12 0%, ${C.surf} 100%)`,
          borderColor: `${C.gold}44`,
        }}
      >
        {/* Hidden Camera Input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Hidden Gallery Input */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${C.gold}22`, color: C.gold }}
            >
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate font-sans">
                {t("split.ocrTitle", "AI OCR Receipt Scanner")}
              </h4>
              <p className="text-[11px] text-tm truncate font-sans">
                {t("split.ocrHint", "Snap receipt to auto extract items & prices")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Gallery Upload Button (iOS Camera Style Overlay Icon) */}
            <motion.button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isExtracting}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/15 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shadow-md disabled:opacity-50 font-sans"
              title="Tải ảnh từ thư viện"
            >
              <ImageIcon size={15} className="text-zinc-200" />
              <span className="hidden sm:inline">Thư viện</span>
            </motion.button>

            {/* Main Camera Button */}
            <motion.button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isExtracting}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 font-sans border-0 shadow-lg"
              style={{ background: C.gold, color: C.bg }}
            >
              <Camera size={15} />
              <span>{t("split.cameraOcrBtn", "Snap Receipt")}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Fullscreen AI Scanning Loading Modal Overlay */}
      <AnimatePresence>
        {isExtracting && (
          <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm rounded-3xl p-8 border border-white/10 flex flex-col items-center justify-center gap-5 text-center shadow-2xl overflow-hidden font-sans"
              style={{ background: "#141416" }}
            >
              {/* Scanning Beam Animation */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-80"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Animated Golden Spinner Circle matching user's screenshot */}
              <div className="relative w-16 h-16 flex items-center justify-center my-2">
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background: C.gold }}
                />
                <Loader2 size={44} color={C.gold} className="animate-spin relative z-10" />
              </div>

              {/* Status Header */}
              <div className="flex flex-col gap-1.5 z-10">
                <h3 className="text-base font-bold text-white leading-snug px-2">
                  {ocrLoadingText || t("split.aiAnalyzing", "Analyzing receipt...")}
                </h3>
                <p className="text-xs text-tm font-medium">
                  {t("split.aiWaitingHint", "Please wait a moment")}
                </p>
              </div>

              {/* Progress Bar indicator */}
              {ocrProgress > 0 && (
                <div className="w-full max-w-[200px] h-1.5 rounded-full overflow-hidden bg-white/10 z-10 my-1">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%`, background: C.gold }}
                  />
                </div>
              )}

              {/* Cancel Button */}
              <motion.button
                type="button"
                onClick={handleCancel}
                whileTap={{ scale: 0.96 }}
                className="mt-2 px-7 py-2.5 rounded-full text-xs font-bold text-white border border-white/20 hover:bg-white/10 transition-colors cursor-pointer bg-transparent z-10"
              >
                {t("common.cancel", "Cancel")}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

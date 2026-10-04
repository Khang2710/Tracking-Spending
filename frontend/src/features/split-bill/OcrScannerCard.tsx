import React, { useRef, useState } from "react";
import { Sparkles, Camera, ImagePlus, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { C } from "../../App";
import { processReceiptOcr, type OcrScanResult } from "../../services/ocrService";
import { compressImage } from "../../utils/imageCompressor";

interface OcrScannerCardProps {
  onItemsParsed: (result: OcrScanResult) => void;
}

export function OcrScannerCard({ onItemsParsed }: OcrScannerCardProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLoadingText, setOcrLoadingText] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExtracting(false);
    setOcrProgress(0);
    setOcrLoadingText("");
    setOcrError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsExtracting(true);
    setOcrError("");
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
        setOcrProgress(30);
        setOcrLoadingText(t("split.aiAnalyzing", "Analyzing receipt..."));

        const result = await processReceiptOcr({
          pureBase64,
          mimeType,
          signal,
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

        if (!signal.aborted && result.items.length > 0) {
          onItemsParsed(result);
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal.aborted) {
        console.log("OCR scan cancelled by user.");
      } else {
        console.error("OCR Scan Error:", err);
        setOcrError(t("split.ocrFailed", "Receipt analysis failed. Please try again."));
      }
    } finally {
      if (!signal.aborted) {
        setIsExtracting(false);
        setOcrProgress(0);
        setOcrLoadingText("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (libraryInputRef.current) libraryInputRef.current.value = "";
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={libraryInputRef}
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
              <h4 className="text-sm font-bold text-[var(--paper-ink)] truncate font-sans">
                {t("split.ocrTitle", "AI OCR Receipt Scanner")}
              </h4>
              <p className="text-[11px] text-tm truncate font-sans">
                {t("split.ocrHint", "Snap receipt to auto extract items & prices")}
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={() => setIsSourcePickerOpen(true)}
            disabled={isExtracting}
            whileTap={{ scale: 0.95 }}
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 font-sans border-0 shadow-lg shrink-0"
            style={{ background: C.gold, color: C.bg }}
          >
            <Camera size={15} />
            <span>{t("split.cameraOcrBtn", "Snap Receipt")}</span>
          </motion.button>
        </div>
        {ocrError && (
          <p role="alert" className="m-0 text-xs font-semibold text-red-700">
            {ocrError}
          </p>
        )}
      </div>

      {isSourcePickerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={t("split.receiptSource", "Choose receipt source")}>
          <div className="w-full max-w-sm rounded-[24px] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-extrabold text-[var(--paper-ink)]">{t("split.receiptSource", "Choose receipt source")}</h3><button type="button" onClick={() => setIsSourcePickerOpen(false)} aria-label={t("common.close", "Close")} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-canvas)] text-[var(--paper-ink)]"><X size={18} aria-hidden="true" /></button></div>
            <p className="mb-4 text-xs font-medium text-[var(--paper-muted)]">{t("split.receiptSourceHint", "Take a new photo or choose an existing receipt image.")}</p>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => { setIsSourcePickerOpen(false); fileInputRef.current?.click(); }} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--paper-ink)] px-3 text-sm font-bold text-white"><Camera size={22} aria-hidden="true" />{t("split.takePhoto", "Take photo")}</button><button type="button" onClick={() => { setIsSourcePickerOpen(false); libraryInputRef.current?.click(); }} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--paper-border)] bg-[var(--paper-canvas)] px-3 text-sm font-bold text-[var(--paper-ink)]"><ImagePlus size={22} aria-hidden="true" />{t("split.chooseFromLibrary", "Choose from library")}</button></div>
          </div>
        </div>
      )}

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

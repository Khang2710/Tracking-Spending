import { useState, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { useTranslation } from "react-i18next";
import { C } from "../../App";
import { useCurrency } from "../../context/CurrencyContext";

interface NudgeButtonProps {
  debtorName: string;
  purpose?: string;
  amount: number;
  className?: string;
}

// 1. Khai báo mảng hằng số NUDGE_QUOTES theo Prompt 25
const NUDGE_QUOTES = [
  "Alo {name}, trả {amount} tiền {purpose} rồi làm gì làm nè!",
  "Tình nghĩa {name} chắc có bền lâu khi {amount} tiền {purpose} chưa trả?",
  "Alo {name}, kèo {purpose} sắp đóng băng vì chờ {amount} đó!",
  "Sống là phải biết điều, trả {amount} tiền {purpose} giùm tui nha {name}!",
  "{name} tính sống chill nhưng {amount} tiền {purpose} không trả là flex xui đó!",
  "Đừng để kèo {purpose} thành nỗi đau, bank ngay {amount} nào {name} ơi!",
  "Alo {name} à {name}, em mà không trả nợ là anh public thông tin của em lên mạng đó.",
];

// Hàm sinh câu quote ngẫu nhiên thế các placeholder
function generateRandomQuote(name: string, amountFormatted: string, purpose: string): string {
  const randomTemplate = NUDGE_QUOTES[Math.floor(Math.random() * NUDGE_QUOTES.length)];
  const safeName = name && name.trim().length > 0 ? name.trim() : "bạn iu";
  const safePurpose = purpose && purpose.trim().length > 0 ? purpose.trim() : "kèo ăn uống";

  return randomTemplate
    .replace(/{name}/g, safeName)
    .replace(/{purpose}/g, safePurpose)
    .replace(/{amount}/g, amountFormatted);
}

export function NudgeButton({
  debtorName,
  purpose,
  amount,
  className = "",
}: NudgeButtonProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const safePurpose = purpose || t("nudge.purpose");
  const memeRef = useRef<HTMLDivElement>(null);
  const formattedAmountStr = formatCurrency(amount);

  const handleNudgeClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // 1. Sinh quote ngẫu nhiên và lưu vào state
      const quoteText = generateRandomQuote(debtorName, formattedAmountStr, safePurpose);
      setCurrentQuote(quoteText);

      // Chờ React cập nhật DOM chứa quote mới
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!memeRef.current) {
        throw new Error("Meme DOM element ref is not available");
      }

      // 2. Chuyển đổi DOM thành ảnh PNG sử dụng html-to-image
      const blob = await toBlob(memeRef.current, {
        width: 600,
        height: 600,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      if (!blob) {
        throw new Error("Failed to convert HTML element to PNG blob");
      }

      // 3. Đổi Blob thành File
      const memeFile = new File([blob], `nudge-${debtorName.toLowerCase().replace(/\s+/g, "-")}.png`, {
        type: "image/png",
      });

      // 4. Web Share API hoặc Fallback Download
      let sharedSuccessfully = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [memeFile] })
      ) {
        try {
          await navigator.share({
            files: [memeFile],
            title: "Đòi nợ Gen Z Tối giản",
            text: `Nhắc nhở nhẹ nhàng gửi đến ${debtorName}!`,
          });
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          if (shareErr.name !== "AbortError") {
            console.warn("Web Share failed, downloading instead", shareErr);
          } else {
            sharedSuccessfully = true;
          }
        }
      }

      if (!sharedSuccessfully) {
        const link = document.createElement("a");
        link.download = `meme-doi-no-${debtorName.toLowerCase().replace(/\s+/g, "-")}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Lỗi khi sinh hoặc chia sẻ meme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Nút bấm Đòi Nợ */}
      <button
        onClick={handleNudgeClick}
        disabled={isLoading}
        className={`px-3 py-1.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${className}`}
        style={{
          background: `linear-gradient(135deg, ${C.purple} 0%, #6D28D9 100%)`,
          color: C.white,
          boxShadow: `0 4px 14px ${C.purple}40`,
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>{t("nudge.loading")}</span>
          </>
        ) : (
          <>
            <Sparkles size={13} />
            <span>{t("nudge.btn")}</span>
          </>
        )}
      </button>

      {/* Render Meme tối giản dạng HTML để html-to-image chụp lại (Offscreen) */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px", pointerEvents: "none" }}>
        <div
          ref={memeRef}
          style={{
            width: "600px",
            height: "600px",
            background: "#0B0B0E",
            color: "#FFFFFF",
            boxSizing: "border-box",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
          }}
        >
          {/* Viền mỏng tối giản */}
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: "40px",
              right: "40px",
              bottom: "40px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div
            style={{
              marginTop: "45px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "#D9B263",
              letterSpacing: "0.1em",
              textAlign: "center",
              zIndex: 1,
            }}
          >
            WEALTHY DEBT REMINDER
          </div>

          {/* Đường kẻ ngang thanh lịch */}
          <div
            style={{
              position: "absolute",
              top: "110px",
              left: "100px",
              right: "100px",
              height: "1px",
              background: "rgba(255, 255, 255, 0.04)",
            }}
          />

          {/* Nội dung câu quote Gen Z */}
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#FFFFFF",
              textAlign: "center",
              lineHeight: "1.6",
              maxWidth: "440px",
              padding: "0 20px",
              zIndex: 1,
              fontStyle: "italic",
            }}
          >
            "{currentQuote || "..."}"
          </div>

          {/* Đường kẻ ngang chân trang */}
          <div
            style={{
              position: "absolute",
              bottom: "110px",
              left: "100px",
              right: "100px",
              height: "1px",
              background: "rgba(255, 255, 255, 0.04)",
            }}
          />

          {/* Thông tin nợ chân trang */}
          <div
            style={{
              marginBottom: "45px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "#9CA3AF",
              letterSpacing: "0.05em",
              textAlign: "center",
              zIndex: 1,
            }}
          >
            DEBTOR: {debtorName.toUpperCase()} | AMOUNT: {formattedAmountStr} | DUE: TODAY
          </div>
        </div>
      </div>
    </>
  );
}

import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { C } from "../../design/tokens";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "vi";

  const toggleLanguage = () => {
    if (currentLang.startsWith("vi")) {
      i18n.changeLanguage("en");
    } else {
      i18n.changeLanguage("vi");
    }
  };

  return (
    <motion.button
      onClick={toggleLanguage}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.white,
      }}
      title={currentLang.startsWith("vi") ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      <span>{currentLang.startsWith("vi") ? "🇻🇳 VI" : "🇺🇸 EN"}</span>
    </motion.button>
  );
}

export function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <motion.button
      onClick={toggleCurrency}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.gold,
      }}
      title={currency === "VND" ? "Chuyển sang USD ($)" : "Chuyển sang VND (₫)"}
    >
      <span>{currency === "VND" ? "🇻🇳 ₫ VND" : "🇺🇸 $ USD"}</span>
    </motion.button>
  );
}



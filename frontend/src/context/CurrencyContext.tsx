import React, { createContext, useContext, useState } from "react";

export type CurrencyType = "VND" | "USD";

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (c: CurrencyType) => void;
  toggleCurrency: () => void;
  formatCurrency: (amount: number, forceRaw?: boolean) => string;
  exchangeRate: number; // 1 USD = 25,000 VND
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    try {
      const saved = localStorage.getItem("wealthy_currency");
      if (saved === "USD" || saved === "VND") return saved;
    } catch (e) {}
    return "VND"; // Default VND
  });

  const exchangeRate = 25000;

  const setCurrency = (c: CurrencyType) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("wealthy_currency", c);
    } catch (e) {}
  };

  const toggleCurrency = () => {
    setCurrency(currency === "VND" ? "USD" : "VND");
  };

  /**
   * Global currency formatter:
   * Accepts numerical amount and formats based on selected currency state (VND or USD).
   * If currency is VND: displays with dots and ₫ symbol (e.g., 150.000 ₫).
   * If currency is USD: displays with $ prefix (e.g., $150.00 or $150).
   */
  const formatCurrency = (amount: number, forceRaw = false): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return currency === "VND" ? "0 ₫" : "$0.00";
    }

    const isNegative = amount < 0;
    const absVal = Math.abs(amount);

    if (currency === "VND") {
      const finalAmount = Math.round(absVal);
      const formatted = finalAmount.toLocaleString("vi-VN");
      return isNegative ? `-${formatted} ₫` : `${formatted} ₫`;
    } else {
      // USD mode
      const isVndScale = !forceRaw && absVal >= 10000;
      const finalAmount = isVndScale ? absVal / exchangeRate : absVal;
      const formatted = finalAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return isNegative ? `-$${formatted}` : `$${formatted}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        formatCurrency,
        exchangeRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};

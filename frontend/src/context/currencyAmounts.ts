export type CurrencyType = "VND" | "USD";

export const VND_PER_USD = 25_000;

export function toStoredAmount(amount: number, currency: CurrencyType): number {
  return currency === "USD" ? amount * VND_PER_USD : amount;
}

export function toDisplayedAmount(amount: number, currency: CurrencyType): number {
  return currency === "USD" ? amount / VND_PER_USD : amount;
}

export function parseAmountInput(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function getCurrencySymbol(currency: CurrencyType): string {
  return currency === "VND" ? "₫" : "$";
}

export function formatAbsoluteCurrency(amount: number, currency: CurrencyType): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "-" : "";
  const absolute = Math.abs(safeAmount);
  if (currency === "VND") return `${sign}${Math.round(absolute).toLocaleString("vi-VN")} ₫`;
  return `${sign}$${absolute.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

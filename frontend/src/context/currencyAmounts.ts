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

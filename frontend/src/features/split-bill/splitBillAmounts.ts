import { CurrencyType, toDisplayedAmount, toStoredAmount } from "../../context/currencyAmounts";

/** Split-bill records share the app's VND-based storage model. */
export function toStoredSplitBillAmount(amount: number, currency: CurrencyType): number {
  return toStoredAmount(amount, currency);
}

export function toDisplayedSplitBillAmount(amount: number, currency: CurrencyType): number {
  return toDisplayedAmount(amount, currency);
}

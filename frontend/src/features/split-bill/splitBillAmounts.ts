import { CurrencyType, toDisplayedAmount, toStoredAmount } from "../../context/currencyAmounts";
import type { OcrScanResult } from "../../services/ocrService";

/** Split-bill records share the app's VND-based storage model. */
export function toStoredSplitBillAmount(amount: number, currency: CurrencyType): number {
  return toStoredAmount(amount, currency);
}

export function toDisplayedSplitBillAmount(amount: number, currency: CurrencyType): number {
  return toDisplayedAmount(amount, currency);
}

export function toStoredOcrScanResult(result: OcrScanResult, currency: CurrencyType): OcrScanResult {
  return {
    items: result.items.map((item) => ({ ...item, price: toStoredSplitBillAmount(item.price, currency) })),
    tax: toStoredSplitBillAmount(result.tax, currency),
    serviceCharge: toStoredSplitBillAmount(result.serviceCharge, currency),
    tip: toStoredSplitBillAmount(result.tip, currency),
    billDiscount: toStoredSplitBillAmount(result.billDiscount, currency),
    otherFees: toStoredSplitBillAmount(result.otherFees, currency),
    receiptTotal: result.receiptTotal === null ? null : toStoredSplitBillAmount(result.receiptTotal, currency),
  };
}

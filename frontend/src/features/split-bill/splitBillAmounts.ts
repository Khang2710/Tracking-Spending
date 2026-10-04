import { CurrencyType } from "../../context/currencyAmounts";
import type { OcrScanResult } from "../../services/ocrService";

/** Split-bill drafts and records are absolute in their explicitly saved currency. */
export function toStoredSplitBillAmount(amount: number, _currency: CurrencyType): number {
  return amount;
}

export function toDisplayedSplitBillAmount(amount: number, _currency: CurrencyType): number {
  return amount;
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

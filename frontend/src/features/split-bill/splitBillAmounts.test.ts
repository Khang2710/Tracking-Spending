import { describe, expect, it } from "vitest";
import { toStoredOcrScanResult, toStoredSplitBillAmount } from "./splitBillAmounts";

describe("split bill amount storage", () => {
  it("stores OCR prices from a USD receipt in the VND-based data model", () => {
    expect(toStoredSplitBillAmount(12.5, "USD")).toBe(312_500);
  });

  it("keeps VND receipt prices unchanged", () => {
    expect(toStoredSplitBillAmount(56_000, "VND")).toBe(56_000);
  });

  it("converts every scanned USD adjustment into VND storage while preserving a missing total", () => {
    expect(toStoredOcrScanResult({
      items: [{ name: "Dinner", price: 191 }],
      tax: 7, serviceCharge: 36, tip: 0, billDiscount: 2, otherFees: 1, receiptTotal: null,
    }, "USD")).toEqual({
      items: [{ name: "Dinner", price: 4_775_000 }],
      tax: 175_000, serviceCharge: 900_000, tip: 0, billDiscount: 50_000, otherFees: 25_000, receiptTotal: null,
    });
  });
});

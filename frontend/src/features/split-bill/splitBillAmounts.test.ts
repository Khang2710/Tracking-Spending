import { describe, expect, it } from "vitest";
import { toStoredOcrScanResult, toStoredSplitBillAmount } from "./splitBillAmounts";

describe("split bill amount storage", () => {
  it("keeps entered USD amounts absolute", () => {
    expect(toStoredSplitBillAmount(12.5, "USD")).toBe(12.5);
  });

  it("keeps VND receipt prices unchanged", () => {
    expect(toStoredSplitBillAmount(56_000, "VND")).toBe(56_000);
  });

  it("keeps every scanned USD adjustment absolute while preserving a missing total", () => {
    expect(toStoredOcrScanResult({
      items: [{ name: "Dinner", price: 191 }],
      tax: 7, serviceCharge: 36, tip: 0, billDiscount: 2, otherFees: 1, receiptTotal: null,
    }, "USD")).toEqual({
      items: [{ name: "Dinner", price: 191 }],
      tax: 7, serviceCharge: 36, tip: 0, billDiscount: 2, otherFees: 1, receiptTotal: null,
    });
  });
});

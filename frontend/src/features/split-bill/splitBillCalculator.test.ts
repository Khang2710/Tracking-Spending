import { describe, expect, it } from "vitest";
import { calculateSplitBill } from "./splitBillCalculator";

describe("split bill calculation", () => {
  it("allocates item and bill discounts, receipt fees, and tax fairly", () => {
    const result = calculateSplitBill({
      participants: ["Khang", "Minh"],
      items: [
        { name: "Khang's dish", price: 100_000, discount: 20_000, consumers: ["Khang"] },
        { name: "Minh's dish", price: 100_000, discount: 0, consumers: ["Minh"] },
      ],
      tax: 18_000, serviceCharge: 20_000, tip: 10_000, billDiscount: 18_000, otherFees: 2_000, receiptTotal: 212_000,
    });

    expect(result.grandTotal).toBe(212_000);
    expect(result.receiptDifference).toBe(0);
    expect(result.debts).toEqual([
      { name: "Khang", itemCost: 100_000, itemDiscount: 20_000, billDiscount: 8_000, tax: 8_000, serviceCharge: 10_000, tip: 5_000, otherFees: 1_000, total: 96_000 },
      { name: "Minh", itemCost: 100_000, itemDiscount: 0, billDiscount: 10_000, tax: 10_000, serviceCharge: 10_000, tip: 5_000, otherFees: 1_000, total: 116_000 },
    ]);
  });

  it("uses equal shares for proportional adjustments when there are no item costs", () => {
    const result = calculateSplitBill({
      participants: ["Khang", "Minh"], items: [], tax: 20_000, serviceCharge: 0, tip: 0, billDiscount: 10_000, otherFees: 0, receiptTotal: null,
    });

    expect(result.debts.map(({ tax, billDiscount }) => ({ tax, billDiscount })))
      .toEqual([{ tax: 10_000, billDiscount: 5_000 }, { tax: 10_000, billDiscount: 5_000 }]);
    expect(result.receiptDifference).toBeNull();
  });
});

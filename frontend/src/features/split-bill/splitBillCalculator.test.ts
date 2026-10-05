import { describe, expect, it } from "vitest";
import { calculateSplitBill } from "./splitBillCalculator";

describe("split bill calculation", () => {
  it("includes manually entered tax and tip in every participant's debt", () => {
    const result = calculateSplitBill({
      participants: ["Khang", "Minh"],
      items: [{ name: "Dinner", price: 500_000, consumers: [] }],
      taxPercent: 10,
      tip: 50_000,
    });

    expect(result.subtotal).toBe(500_000);
    expect(result.totalTax).toBe(50_000);
    expect(result.grandTotal).toBe(600_000);
    expect(result.debts).toEqual([
      { name: "Khang", itemCost: 250_000, tax: 25_000, total: 300_000 },
      { name: "Minh", itemCost: 250_000, tax: 25_000, total: 300_000 },
    ]);
  });
});

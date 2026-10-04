import { describe, expect, it } from "vitest";
import { formatAbsoluteCurrency, parseAmountInput, toDisplayedAmount, toStoredAmount } from "./currencyAmounts";

describe("currency amount conversion", () => {
  it("stores a USD amount in the VND-based data model and displays it back unchanged", () => {
    const storedAmount = toStoredAmount(20_000, "USD");

    expect(storedAmount).toBe(500_000_000);
    expect(toDisplayedAmount(storedAmount, "USD")).toBe(20_000);
  });

  it("does not alter a VND amount", () => {
    expect(toStoredAmount(20_000, "VND")).toBe(20_000);
    expect(toDisplayedAmount(20_000, "VND")).toBe(20_000);
  });

  it("accepts a localized decimal comma", () => {
    expect(parseAmountInput("3,4")).toBe(3.4);
  });

  it("formats feature-owned absolute amounts without converting the selected currency", () => {
    expect(formatAbsoluteCurrency(16, "USD")).toBe("$16");
    expect(formatAbsoluteCurrency(16, "VND")).toBe("16 ₫");
  });
});

import { describe, expect, it } from "vitest";
import { toStoredSplitBillAmount } from "./splitBillAmounts";

describe("split bill amount storage", () => {
  it("stores OCR prices from a USD receipt in the VND-based data model", () => {
    expect(toStoredSplitBillAmount(12.5, "USD")).toBe(312_500);
  });

  it("keeps VND receipt prices unchanged", () => {
    expect(toStoredSplitBillAmount(56_000, "VND")).toBe(56_000);
  });
});

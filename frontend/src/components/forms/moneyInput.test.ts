import { describe, expect, it } from "vitest";
import { normalizeMoneyDraft, parseMoneyDraft } from "./moneyInputModel";

describe("money input draft", () => {
  it("removes insignificant leading zeroes without changing decimals", () => {
    expect(normalizeMoneyDraft("016")).toBe("16");
    expect(normalizeMoneyDraft("000.75")).toBe("0.75");
    expect(normalizeMoneyDraft("0.")).toBe("0.");
  });

  it("accepts a comma decimal separator and keeps an empty draft transient", () => {
    expect(normalizeMoneyDraft("12,50")).toBe("12.50");
    expect(parseMoneyDraft("")).toBeNull();
    expect(parseMoneyDraft("12.50")).toBe(12.5);
  });

  it("rejects invalid and negative money drafts without producing NaN", () => {
    expect(normalizeMoneyDraft("12.3.4")).toBe("12.34");
    expect(normalizeMoneyDraft("-3")).toBe("3");
    expect(parseMoneyDraft(".")).toBeNull();
  });
});

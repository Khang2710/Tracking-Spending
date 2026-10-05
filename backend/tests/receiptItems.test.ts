import { describe, expect, it } from "vitest";
import { extractReceiptItems, parseReceiptPrice } from "../src/modules/receipt-ocr/receiptItems.js";

describe("parseReceiptPrice", () => {
  it.each([
    ["56.000", 56_000],
    ["1,234.56", 1_234.56],
    ["12,50", 12.5],
    [-15, 15],
  ])("normalizes %j to %d", (input, expected) => {
    expect(parseReceiptPrice(input)).toBe(expected);
  });
});

describe("extractReceiptItems", () => {
  it("extracts a JSON array wrapped in model markdown", () => {
    const raw = '```json\n[{"name":"Pho","price":"56.000"}]\n```';

    expect(extractReceiptItems(raw)).toEqual([{ name: "Pho", price: 56_000 }]);
  });

  it("supports an object with an items property and alternate field names", () => {
    const raw = '{"items":[{"description":"Coffee","total":"4.50"}]}';

    expect(extractReceiptItems(raw)).toEqual([{ name: "Coffee", price: 4.5 }]);
  });

  it("drops unusable entries instead of inventing receipt lines", () => {
    const raw = '[{"name":"","price":12},{"name":"Tea","price":"unknown"}]';

    expect(extractReceiptItems(raw)).toEqual([]);
  });
});

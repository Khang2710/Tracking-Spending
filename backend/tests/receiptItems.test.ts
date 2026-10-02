import { describe, expect, it } from "vitest";
import { extractReceiptItems, extractReceiptScan, parseReceiptPrice } from "../src/modules/receipt-ocr/receiptItems.js";

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

describe("extractReceiptScan", () => {
  it("returns purchased items and the separate service charge", () => {
    expect(extractReceiptScan('{"items":[{"name":"Egust","price":35}],"serviceCharge":36}'))
      .toEqual({ items: [{ name: "Egust", price: 35 }], serviceCharge: 36 });
  });

  it("normalizes service charge amounts in wrapped model JSON", () => {
    expect(extractReceiptScan('<think>reading</think>```json\n{"serviceCharge":"36.000","items":[{"name":"Tea","price":3}]}\n```'))
      .toEqual({ items: [{ name: "Tea", price: 3 }], serviceCharge: 36_000 });
  });

  it.each([
    ['[{"name":"Tea","price":3}]', { items: [{ name: "Tea", price: 3 }], serviceCharge: 0 }],
    ['{"items":[{"name":"Tea","price":3}]}', { items: [{ name: "Tea", price: 3 }], serviceCharge: 0 }],
    ['{"items":[],"serviceCharge":"unknown"}', { items: [], serviceCharge: 0 }],
    ['not JSON', { items: [], serviceCharge: 0 }],
    ['null', { items: [], serviceCharge: 0 }],
  ])("handles legacy or unusable output %s", (raw, expected) => {
    expect(extractReceiptScan(raw)).toEqual(expected);
  });
});

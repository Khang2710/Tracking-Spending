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
  const defaults = { tax: 0, serviceCharge: 0, tip: 0, billDiscount: 0, otherFees: 0, receiptTotal: null };

  it("returns purchased items and the complete receipt breakdown", () => {
    expect(extractReceiptScan('{"items":[{"name":"Food","price":191}],"tax":7,"serviceCharge":36,"tip":0,"billDiscount":0,"otherFees":0,"receiptTotal":234}'))
      .toEqual({ items: [{ name: "Food", price: 191 }], tax: 7, serviceCharge: 36, tip: 0, billDiscount: 0, otherFees: 0, receiptTotal: 234 });
  });

  it("normalizes service charge amounts in wrapped model JSON", () => {
    expect(extractReceiptScan('<think>reading</think>```json\n{"serviceCharge":"36.000","items":[{"name":"Tea","price":3}]}\n```'))
      .toEqual({ items: [{ name: "Tea", price: 3 }], ...defaults, serviceCharge: 36_000 });
  });

  it("normalizes every explicit amount even when tax is the first object field", () => {
    expect(extractReceiptScan('Result: {"tax":"$7.00","serviceCharge":"$36.00","tip":"12,50","billDiscount":"$5.00","otherFees":"$2.00","receiptTotal":"$243.50","items":[{"name":"Food","price":191}]}'))
      .toEqual({ items: [{ name: "Food", price: 191 }], tax: 7, serviceCharge: 36, tip: 12.5, billDiscount: 5, otherFees: 2, receiptTotal: 243.5 });
  });

  it.each(["tax", "serviceCharge", "tip", "billDiscount", "otherFees"])(
    "defaults invalid %s amounts to zero while preserving items",
    (field) => {
      for (const invalid of [-7, "-7", "−7", "10%", "10％", "unknown", null, true, {}, "", "9".repeat(400)]) {
        expect(extractReceiptScan(JSON.stringify({ items: [{ name: "Tea", price: 3 }], [field]: invalid })))
          .toEqual({ items: [{ name: "Tea", price: 3 }], ...defaults });
      }
    },
  );

  it.each([undefined, null, -234, "-$234", "234%", "unknown", false, {}, "", "9".repeat(400)])(
    "keeps missing or invalid printed total %j unknown",
    (receiptTotal) => {
      expect(extractReceiptScan(JSON.stringify({ items: [{ name: "Tea", price: 3 }], receiptTotal })))
        .toEqual({ items: [{ name: "Tea", price: 3 }], ...defaults });
    },
  );

  it("preserves an explicit zero printed total", () => {
    expect(extractReceiptScan('{"items":[{"name":"Tea","price":3}],"receiptTotal":0}'))
      .toEqual({ items: [{ name: "Tea", price: 3 }], ...defaults, receiptTotal: 0 });
  });

  it.each([-36, "-36", "-$36", "10%", "10 %", "10％"])(
    "rejects invalid service charge %j while preserving purchased items",
    (serviceCharge) => {
      expect(extractReceiptScan(JSON.stringify({
        items: [{ name: "Egust", price: 35 }], serviceCharge,
      }))).toEqual({ items: [{ name: "Egust", price: 35 }], ...defaults });
    },
  );

  it.each([
    ['[{"name":"Tea","price":3}]', { items: [{ name: "Tea", price: 3 }], serviceCharge: 0 }],
    ['{"items":[{"name":"Tea","price":3}]}', { items: [{ name: "Tea", price: 3 }], serviceCharge: 0 }],
    ['{"items":[],"serviceCharge":"unknown"}', { items: [], serviceCharge: 0 }],
    ['not JSON', { items: [], serviceCharge: 0 }],
    ['null', { items: [], serviceCharge: 0 }],
  ])("handles legacy or unusable output %s", (raw, expected) => {
    expect(extractReceiptScan(raw)).toEqual({ ...defaults, ...expected });
  });
});

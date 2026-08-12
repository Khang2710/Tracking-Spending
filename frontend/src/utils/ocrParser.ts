// Module-level hoisted RegExp constants for high performance
const THOUSAND_REGEX = /\b\d{1,3}(?:[.,]\d{3})+\b/;
const NUM_SEQ_REGEX = /\d+(?:[.,]\d+)*/;
const DECIMAL_DOT_REGEX = /\.\d{1,2}$/;
const DECIMAL_COMMA_REGEX = /,\d{1,2}$/;
const RAW_LINE_PARSER_REGEX = /(.*?)\$?(\d+(?:\.\d{1,2})?)\s*$/;
const LEADING_CHARS_REGEX = /^[\d\s.\-*]+/;

/**
 * Normalizes price values extracted from raw AI text or inputs into pure Numbers.
 * Handles Vietnamese thousand separators (e.g. 9.000 -> 9000, 56.000 -> 56000, 3.565.000 -> 3565000).
 */
export function parsePriceHelper(rawPrice: any): number {
  if (typeof rawPrice === "number" && !isNaN(rawPrice) && isFinite(rawPrice)) {
    return Math.abs(rawPrice);
  }
  if (!rawPrice) return 0;

  const strP = String(rawPrice).trim();
  if (/^\d+$/.test(strP)) {
    return parseFloat(strP) || 0;
  }

  // 1. Look for formatted thousand numbers (e.g. 9.000, 56.000, 3.565.000)
  const thousandMatch = strP.match(THOUSAND_REGEX);
  if (thousandMatch) {
    const cleanVnd = thousandMatch[0].replace(/[.,]/g, "");
    return parseFloat(cleanVnd) || 0;
  }

  // 2. Extract number sequence
  const numMatch = strP.match(NUM_SEQ_REGEX);
  if (!numMatch) return 0;

  let numStr = numMatch[0];

  // Handle standard decimal formats like 1,234.56 or 15.5
  if (DECIMAL_DOT_REGEX.test(numStr)) {
    numStr = numStr.replace(/,/g, "");
    return parseFloat(numStr) || 0;
  } else if (DECIMAL_COMMA_REGEX.test(numStr)) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
    return parseFloat(numStr) || 0;
  }

  const cleanVnd = numStr.replace(/[.,]/g, "");
  return parseFloat(cleanVnd) || 0;
}

/**
 * Parses raw receipt text line-by-line (e.g., when user pastes text into textarea).
 */
export function parseRawReceiptText(rawText: string): Array<{ name: string; price: number }> {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split("\n");
  const parsedItems: Array<{ name: string; price: number }> = [];

  lines.forEach((line) => {
    const match = line.match(RAW_LINE_PARSER_REGEX);
    if (match) {
      const name = match[1].trim().replace(LEADING_CHARS_REGEX, "");
      const price = parseFloat(match[2]);
      if (name && !isNaN(price)) {
        parsedItems.push({
          name,
          price,
        });
      }
    }
  });

  return parsedItems;
}

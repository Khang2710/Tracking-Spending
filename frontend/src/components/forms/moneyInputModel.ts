export function normalizeMoneyDraft(value: string): string {
  const normalizedSeparator = value.replace(/,/g, ".");
  const unsigned = normalizedSeparator.replace(/-/g, "");
  const [whole = "", ...fractionParts] = unsigned.split(".");
  const digits = whole.replace(/\D/g, "");
  const fraction = fractionParts.join("").replace(/\D/g, "");
  const hasDecimal = unsigned.includes(".");
  const normalizedWhole = digits.replace(/^0+(?=\d)/, "") || (hasDecimal ? "0" : "");
  return hasDecimal ? `${normalizedWhole}.${fraction}` : normalizedWhole;
}

export function parseMoneyDraft(value: string): number | null {
  if (value === "" || value === ".") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoneyDraft(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "" : String(value);
}

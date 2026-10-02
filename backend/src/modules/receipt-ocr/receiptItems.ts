export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ReceiptScanResult {
  items: ReceiptItem[];
  serviceCharge: number;
}

export function parseReceiptPrice(rawPrice: unknown): number {
  if (typeof rawPrice === "number") {
    return Number.isFinite(rawPrice) ? Math.abs(rawPrice) : 0;
  }
  if (typeof rawPrice !== "string") return 0;
  const value = rawPrice.trim();
  if (!value) return 0;

  const match = value.match(/-?\d+(?:[.,]\d+)*/)?.[0];
  if (!match) return 0;
  const unsigned = match.replace("-", "");
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(unsigned)) {
    return Number(unsigned.replace(/[.,]/g, ""));
  }
  if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(unsigned)) {
    return Number(unsigned.replace(/,/g, ""));
  }
  if (/,\d{1,2}$/.test(unsigned)) {
    return Number(unsigned.replace(/\./g, "").replace(",", "."));
  }
  return Number(unsigned.replace(/,/g, "")) || 0;
}

function parseReceiptJson(raw: string): unknown {
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const objectMatch = clean.match(/\{\s*"(?:items|serviceCharge)"[\s\S]*\}/);
  const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);

  return JSON.parse(objectMatch?.[0] ?? arrayMatch?.[0] ?? clean);
}

export function extractReceiptItems(raw: string): ReceiptItem[] {
  try {
    const parsed = parseReceiptJson(raw);
    const candidates = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : [];

    return candidates.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const item = candidate as Record<string, unknown>;
      const rawName = item.name ?? item.item ?? item.description;
      const name = typeof rawName === "string" ? rawName.trim() : "";
      const price = parseReceiptPrice(item.price ?? item.amount ?? item.total);
      return name && price > 0 ? [{ name, price }] : [];
    });
  } catch {
    return [];
  }
}

export function extractReceiptScan(raw: string): ReceiptScanResult {
  try {
    const parsed = parseReceiptJson(raw);
    const serviceCharge = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parseReceiptPrice((parsed as { serviceCharge?: unknown }).serviceCharge)
      : 0;
    return { items: extractReceiptItems(raw), serviceCharge };
  } catch {
    return { items: [], serviceCharge: 0 };
  }
}

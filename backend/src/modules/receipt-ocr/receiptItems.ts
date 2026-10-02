export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ReceiptScanResult {
  items: ReceiptItem[];
  tax: number;
  serviceCharge: number;
  tip: number;
  billDiscount: number;
  otherFees: number;
  receiptTotal: number | null;
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
  const objectMatch = clean.match(/\{\s*"(?:items|tax|serviceCharge|tip|billDiscount|otherFees|receiptTotal)"[\s\S]*\}/);
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

function parseReceiptAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== "string" || /[-−%％]/.test(raw) || !/\d/.test(raw)) return null;
  const amount = parseReceiptPrice(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function extractReceiptScan(raw: string): ReceiptScanResult {
  const defaults: ReceiptScanResult = {
    items: [], tax: 0, serviceCharge: 0, tip: 0, billDiscount: 0, otherFees: 0, receiptTotal: null,
  };
  try {
    const parsed = parseReceiptJson(raw);
    const amounts = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    return {
      items: extractReceiptItems(raw),
      tax: parseReceiptAmount(amounts.tax) ?? 0,
      serviceCharge: parseReceiptAmount(amounts.serviceCharge) ?? 0,
      tip: parseReceiptAmount(amounts.tip) ?? 0,
      billDiscount: parseReceiptAmount(amounts.billDiscount) ?? 0,
      otherFees: parseReceiptAmount(amounts.otherFees) ?? 0,
      receiptTotal: parseReceiptAmount(amounts.receiptTotal),
    };
  } catch {
    return defaults;
  }
}

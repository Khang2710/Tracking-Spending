import type { Transaction } from "../../types/finance";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface TransactionDateInfo {
  month: number;
  year: number;
}

export function parseTransactionDate(dateText: string, fallback = new Date()): TransactionDateInfo {
  const fallbackValue = { month: fallback.getMonth(), year: fallback.getFullYear() };
  const trimmed = dateText.trim();
  if (!trimmed || trimmed.startsWith("Today") || trimmed.startsWith("Hôm nay")) return fallbackValue;

  const match = /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/.exec(trimmed);
  if (match) {
    const first = Number(match[1]);
    const middle = Number(match[2]);
    const last = Number(match[3]);
    const year = first > 1000 ? first : last > 1000 ? last : Number.NaN;
    if (Number.isInteger(year) && middle >= 1 && middle <= 12) return { month: middle - 1, year };
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? fallbackValue
    : { month: parsed.getMonth(), year: parsed.getFullYear() };
}

export function getTransactionsForMonth(transactions: Transaction[], month: number, year: number): Transaction[] {
  return transactions.filter((transaction) => {
    const date = parseTransactionDate(transaction.date);
    return date.month === month && date.year === year;
  });
}

export function buildYearlyChartData(transactions: Transaction[], year: number) {
  return MONTH_LABELS.map((monthLabel, month) => {
    const totals = getTransactionsForMonth(transactions, month, year).reduce(
      (sum, transaction) => transaction.amount >= 0
        ? { ...sum, income: sum.income + transaction.amount }
        : { ...sum, outcome: sum.outcome + Math.abs(transaction.amount) },
      { income: 0, outcome: 0 },
    );
    return {
      m: monthLabel,
      ...totals,
      savings: Math.max(0, totals.income - totals.outcome),
    };
  });
}

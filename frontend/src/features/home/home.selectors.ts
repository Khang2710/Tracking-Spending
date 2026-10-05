import type { Transaction } from "../../types/finance";

export interface MonthlyBudgetSummary {
  spent: number;
  limit: number;
  percent: number;
  rawPercent: number;
  dailyAverage: number;
  dailyLimit: number;
  daysLeft: number;
  overAmount: number;
}

export function getMonthlyBudgetSummary(
  transactions: Transaction[],
  budget: number,
  now: Date,
): MonthlyBudgetSummary {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const spent = transactions.reduce((total, transaction) => {
    const transactionDate = parseTransactionDate(transaction.date);
    const isCurrentMonth =
      transactionDate !== null &&
      transactionDate.getFullYear() === year &&
      transactionDate.getMonth() === month;

    return isCurrentMonth && transaction.amount < 0
      ? total + Math.abs(transaction.amount)
      : total;
  }, 0);
  const rawPercent = budget > 0 ? (spent / budget) * 100 : 0;

  return {
    spent,
    limit: budget,
    percent: Math.min(Math.round(rawPercent), 100),
    rawPercent,
    dailyAverage: spent / daysInMonth,
    dailyLimit: budget > 0 ? budget / daysInMonth : 0,
    daysLeft: Math.max(daysInMonth - now.getDate(), 0),
    overAmount: Math.max(spent - budget, 0),
  };
}

export function formatHomeDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function getRecentTransactions(
  transactions: Transaction[],
  limit: number,
): Transaction[] {
  return [...transactions]
    .sort((left, right) => {
      const rightTime = parseTransactionDate(right.date)?.getTime() ?? 0;
      const leftTime = parseTransactionDate(left.date)?.getTime() ?? 0;
      return rightTime - leftTime || right.id - left.id;
    })
    .slice(0, Math.max(limit, 0));
}

function parseTransactionDate(value: string): Date | null {
  const isoDate = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

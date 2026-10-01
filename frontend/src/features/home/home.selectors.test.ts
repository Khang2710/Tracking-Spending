import { describe, expect, it } from "vitest";
import type { Transaction } from "../../types/finance";
import {
  formatHomeDate,
  getMonthlyBudgetSummary,
  getRecentTransactions,
} from "./home.selectors";

const transactions: Transaction[] = [
  { id: 1, name: "Rent", date: "2026-09-02", amount: -600, category: "Housing", walletId: 1 },
  { id: 2, name: "Salary", date: "2026-09-03", amount: 2_000, category: "Salary", walletId: 1 },
  { id: 3, name: "Coffee", date: "2026-09-20", amount: -40, category: "Drinks", walletId: 1 },
  { id: 4, name: "Old expense", date: "2026-08-20", amount: -500, category: "Others", walletId: 1 },
];

describe("getMonthlyBudgetSummary", () => {
  it("counts only expenses in the current month", () => {
    const summary = getMonthlyBudgetSummary(transactions, 1_000, new Date(2026, 8, 22));

    expect(summary.spent).toBe(640);
    expect(summary.percent).toBe(64);
    expect(summary.overAmount).toBe(0);
  });

  it("clamps visual percentage but keeps the real over-budget amount", () => {
    const summary = getMonthlyBudgetSummary(transactions, 500, new Date(2026, 8, 22));

    expect(summary.percent).toBe(100);
    expect(summary.rawPercent).toBe(128);
    expect(summary.overAmount).toBe(140);
  });

  it("returns safe zero values when no budget is configured", () => {
    const summary = getMonthlyBudgetSummary(transactions, 0, new Date(2026, 8, 22));

    expect(summary.percent).toBe(0);
    expect(summary.dailyLimit).toBe(0);
  });
});

describe("formatHomeDate", () => {
  it("formats a Vietnamese date on one line without the year", () => {
    expect(formatHomeDate(new Date(2026, 8, 22), "vi-VN")).toBe("Thứ Ba, 22 tháng 9");
  });
});

describe("getRecentTransactions", () => {
  it("keeps the newest requested transactions without mutating input", () => {
    const originalIds = transactions.map((transaction) => transaction.id);
    const recent = getRecentTransactions(transactions, 2);

    expect(recent.map((transaction) => transaction.id)).toEqual([3, 2]);
    expect(transactions.map((transaction) => transaction.id)).toEqual(originalIds);
  });
});

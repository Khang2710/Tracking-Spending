import { describe, expect, it } from "vitest";
import type { Transaction } from "../../types/finance";
import { buildYearlyChartData, getTransactionsForMonth } from "./statistics.selectors";

const transactions: Transaction[] = [
  { id: 1, name: "Current income", date: "2026-10-04", amount: 500, category: "Salary", walletId: 1 },
  { id: 2, name: "Current expense", date: "04/10/2026", amount: -125, category: "Food", walletId: 1 },
  { id: 3, name: "Previous year", date: "2025-10-04", amount: -999, category: "Food", walletId: 1 },
];

describe("statistics selectors", () => {
  it("keeps the selected month scoped to the selected year", () => {
    expect(getTransactionsForMonth(transactions, 9, 2026).map((transaction) => transaction.id)).toEqual([1, 2]);
  });

  it("builds yearly chart totals without mixing the same month from another year", () => {
    const october = buildYearlyChartData(transactions, 2026)[9];

    expect(october).toMatchObject({ income: 500, outcome: 125, savings: 375 });
  });
});

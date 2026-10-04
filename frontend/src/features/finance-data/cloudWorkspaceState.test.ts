import { describe, expect, it } from "vitest";
import { emptyCloudFinance } from "./cloudWorkspaceState";

describe("emptyCloudFinance", () => {
  it("removes every finance row and cloud UUID while an account is loading", () => {
    expect(emptyCloudFinance()).toEqual({
      wallets: [],
      transactions: [],
      savingsGoals: [],
      budget: 0,
      walletCloudIds: new Map(),
      transactionCloudIds: new Map(),
      savingsGoalCloudIds: new Map(),
      budgetCloudId: null,
      recurringExpenses: [],
      legacyRecurringSourceIds: new Set(),
    });
  });
});

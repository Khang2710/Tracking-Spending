import type { MappedCloudFinance } from "./finance.repository";

export function emptyCloudFinance(): MappedCloudFinance {
  return {
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
  };
}

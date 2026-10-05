import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MappedCloudFinance } from "./finance.repository";
import { useFinanceWorkspace } from "./useFinanceWorkspace";

const repository = vi.hoisted(() => ({
  loadCloudFinance: vi.fn(),
  createCloudWallet: vi.fn(),
  createCloudTransaction: vi.fn(),
  createCloudRecurringExpense: vi.fn(),
  createCloudSavingsGoal: vi.fn(),
  updateCloudTransaction: vi.fn(),
  deleteCloudTransaction: vi.fn(),
  updateCloudWallet: vi.fn(),
  deleteCloudWallet: vi.fn(),
  updateCloudSavingsGoal: vi.fn(),
  deleteCloudSavingsGoal: vi.fn(),
  updateCloudRecurringExpense: vi.fn(),
  deleteCloudRecurringExpense: vi.fn(),
  confirmCloudRecurringOccurrence: vi.fn(),
  saveCloudBudget: vi.fn(),
}));

vi.mock("./finance.repository", () => repository);

function workspace(overrides: Partial<MappedCloudFinance> = {}): MappedCloudFinance {
  return {
    wallets: [], transactions: [], savingsGoals: [], budget: 0, recurringExpenses: [],
    walletCloudIds: new Map(), transactionCloudIds: new Map(), savingsGoalCloudIds: new Map(),
    budgetCloudId: null, legacyRecurringSourceIds: new Set(), ...overrides,
  };
}

describe("useFinanceWorkspace", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("loads the authenticated workspace and exposes derived balances", async () => {
    repository.loadCloudFinance.mockResolvedValue(workspace({
      wallets: [{ id: 1, label: "Main", balance: 1_000, accent: "black" }],
      savingsGoals: [{ id: 1, title: "Trip", targetAmount: 500, currentAmount: 200, icon: "PiggyBank", color: "gold", deadline: "", status: "IN_PROGRESS" }],
    }));

    const { result } = renderHook(() => useFinanceWorkspace({ userId: "user-1", isVietnamese: false }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.totalBalance).toBe(1_000);
    expect(result.current.availableBalance).toBe(800);
  });

  it("keeps a failed transaction form open by returning a failed mutation result", async () => {
    repository.loadCloudFinance.mockResolvedValue(workspace({
      wallets: [{ id: 1, label: "Main", balance: 0, accent: "black" }],
      walletCloudIds: new Map([[1, "wallet-cloud-id"]]),
    }));
    repository.createCloudTransaction.mockRejectedValue(new Error("network unavailable"));
    const { result } = renderHook(() => useFinanceWorkspace({ userId: "user-1", isVietnamese: false }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let saveResult: { ok: boolean } | undefined;
    await act(async () => {
      saveResult = await result.current.addTransaction({ name: "Lunch", amount: -12, date: "2026-10-04", category: "Food", walletId: 1 });
    });

    expect(saveResult).toEqual({ ok: false });
    expect(result.current.loadError).toMatch(/could not be saved/i);
  });
});

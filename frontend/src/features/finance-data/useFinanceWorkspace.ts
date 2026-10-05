import { useEffect, useRef, useState } from "react";
import type { RecurringExpense } from "../recurring-expenses/recurring.types";
import { getUpcomingOccurrences } from "../recurring-expenses/recurring.schedule";
import { readLegacyRecurringExpenses } from "../recurring-expenses/recurring.legacy";
import type { SavingsGoal, Transaction, Wallet } from "../../types/finance";
import { C } from "../../design/tokens";
import {
  confirmCloudRecurringOccurrence,
  createCloudRecurringExpense,
  createCloudSavingsGoal,
  createCloudTransaction,
  createCloudWallet,
  deleteCloudRecurringExpense,
  deleteCloudSavingsGoal,
  deleteCloudTransaction,
  deleteCloudWallet,
  loadCloudFinance,
  saveCloudBudget,
  updateCloudRecurringExpense,
  updateCloudSavingsGoal,
  updateCloudTransaction,
  updateCloudWallet,
} from "./finance.repository";
import { emptyCloudFinance } from "./cloudWorkspaceState";

type LoadStatus = "loading" | "ready" | "error";
type SaveResult = { ok: true } | { ok: false };

interface UseFinanceWorkspaceOptions {
  userId?: string;
  isVietnamese: boolean;
}

function readCachedArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error) {
    console.error(`Unable to read ${key} from localStorage`, error);
    return [];
  }
}

function readCachedBudget(): number {
  const amount = Number(localStorage.getItem("wealthy_v2_budget"));
  return Number.isFinite(amount) && amount >= 0 && ![1_000_000, 1_000, 820].includes(amount) ? amount : 0;
}

export function useFinanceWorkspace({ userId, isVietnamese }: UseFinanceWorkspaceOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => readCachedArray("wealthy_v2_transactions"));
  const [wallets, setWallets] = useState<Wallet[]>(() => readCachedArray("wealthy_v2_wallets"));
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => readCachedArray("wealthy_v2_savings_goals"));
  const [budget, setBudget] = useState(readCachedBudget);
  const legacyRecurringExpensesRef = useRef<RecurringExpense[]>(readLegacyRecurringExpenses());
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(legacyRecurringExpensesRef.current);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [loadedUserId, setLoadedUserId] = useState<string>();
  const [reloadAttempt, setReloadAttempt] = useState(0);

  const walletCloudIdsRef = useRef(new Map<number, string>());
  const pendingWalletCreatesRef = useRef(new Map<number, Promise<string>>());
  const transactionCloudIdsRef = useRef(new Map<number, string>());
  const savingsGoalCloudIdsRef = useRef(new Map<number, string>());

  const isReady = loadStatus === "ready" && loadedUserId === userId;

  const applyCloudFinance = (cloudData: Awaited<ReturnType<typeof loadCloudFinance>>) => {
    walletCloudIdsRef.current = cloudData.walletCloudIds;
    transactionCloudIdsRef.current = cloudData.transactionCloudIds;
    savingsGoalCloudIdsRef.current = cloudData.savingsGoalCloudIds;
    setWallets(cloudData.wallets);
    setTransactions(cloudData.transactions);
    setSavingsGoals(cloudData.savingsGoals);
    setRecurringExpenses(cloudData.recurringExpenses);
    setBudget(cloudData.budget);
  };

  const refresh = async () => {
    applyCloudFinance(await loadCloudFinance());
    setLoadError("");
  };

  const reportSaveError = (error: unknown): SaveResult => {
    console.error("Unable to save cloud finance data", error);
    const migrationRequired = error instanceof Error && error.message.includes("Recurring expenses setup is incomplete");
    setLoadError(migrationRequired
      ? (isVietnamese
        ? "Recurring Expenses chưa được thiết lập trong database. Hãy áp dụng migration rồi thử lại; thông tin bạn đang nhập vẫn được giữ nguyên."
        : "Recurring Expenses is not set up in the database yet. Apply the migration and try again; the form stays open.")
      : (isVietnamese ? "Không thể lưu dữ liệu lên cloud. Hãy thử lại." : "Cloud data could not be saved. Please try again."));
    return { ok: false };
  };

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem("wealthy_v2_transactions", JSON.stringify(transactions));
    localStorage.setItem("wealthy_v2_wallets", JSON.stringify(wallets));
    localStorage.setItem("wealthy_v2_savings_goals", JSON.stringify(savingsGoals));
    localStorage.setItem("wealthy_v2_budget", String(budget));
  }, [budget, isReady, savingsGoals, transactions, wallets]);

  useEffect(() => {
    let cancelled = false;
    const emptyData = emptyCloudFinance();
    setLoadStatus("loading");
    setLoadedUserId(undefined);
    setLoadError("");
    applyCloudFinance(emptyData);

    void loadCloudFinance()
      .then(async (cloudData) => {
        if (cancelled) return;
        const legacyExpenses = legacyRecurringExpensesRef.current;
        const cloudContainsOnlyImportedLegacy = cloudData.recurringExpenses.length === cloudData.legacyRecurringSourceIds.size;
        const missingLegacyExpenses = legacyExpenses.filter((expense) => !cloudData.legacyRecurringSourceIds.has(expense.id));
        if (cloudContainsOnlyImportedLegacy && missingLegacyExpenses.length > 0) {
          const importResults = await Promise.all(missingLegacyExpenses.map(async (expense) => {
            const walletCloudId = cloudData.walletCloudIds.get(expense.walletId);
            if (!walletCloudId) return false;
            await createCloudRecurringExpense({ ...expense, walletId: walletCloudId, legacySourceId: expense.id });
            return true;
          }));
          if (cancelled) return;
          if (importResults.every(Boolean)) {
            cloudData = await loadCloudFinance();
            if (legacyExpenses.every((expense) => cloudData.legacyRecurringSourceIds.has(expense.id))) {
              legacyRecurringExpensesRef.current = [];
              localStorage.removeItem("wealthy_v2_recurring_expenses");
              localStorage.removeItem("wealthy_v2_recurring_occurrences");
            }
          }
        }
        applyCloudFinance(cloudData);
        setLoadedUserId(userId);
        setLoadStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Unable to load cloud finance data", error);
        setLoadError(isVietnamese ? "Không thể tải dữ liệu đã đồng bộ. Hãy thử lại." : "Cloud data could not be loaded. Please try again.");
        setLoadStatus("error");
      });

    return () => { cancelled = true; };
  }, [reloadAttempt, userId]);

  const addTransaction = async (transaction: Omit<Transaction, "id">, walletId?: number): Promise<SaveResult> => {
    const wallet = wallets.find((item) => item.id === (walletId || transaction.walletId)) ?? wallets[0];
    const targetWalletId = wallet?.id ?? walletId ?? transaction.walletId ?? 1;
    try {
      let cloudWalletId = walletCloudIdsRef.current.get(targetWalletId);
      if (!cloudWalletId) {
        const walletToCreate = wallet ?? { id: targetWalletId, label: "Main Wallet", balance: 0, accent: C.purple };
        cloudWalletId = await (pendingWalletCreatesRef.current.get(targetWalletId) ?? createCloudWallet(walletToCreate));
        walletCloudIdsRef.current.set(targetWalletId, cloudWalletId);
      }
      await createCloudTransaction({ ...transaction, walletId: targetWalletId, id: 0 }, cloudWalletId);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const updateTransaction = async (transaction: Transaction): Promise<SaveResult> => {
    const cloudTransactionId = transactionCloudIdsRef.current.get(transaction.id);
    const cloudWalletId = walletCloudIdsRef.current.get(transaction.walletId);
    if (!cloudTransactionId || !cloudWalletId) return reportSaveError(new Error("Transaction is not synchronized."));
    try {
      await updateCloudTransaction(cloudTransactionId, transaction, cloudWalletId);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const deleteTransaction = async (id: number): Promise<SaveResult> => {
    const cloudId = transactionCloudIdsRef.current.get(id);
    if (!transactions.some((transaction) => transaction.id === id) || !cloudId) {
      return reportSaveError(new Error("Transaction is not synchronized."));
    }
    try {
      await deleteCloudTransaction(cloudId);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const addWallet = async (input: Omit<Wallet, "id">): Promise<SaveResult> => {
    const wallet = { ...input, id: Math.max(0, ...wallets.map((item) => item.id)) + 1 };
    try {
      const request = createCloudWallet(wallet);
      pendingWalletCreatesRef.current.set(wallet.id, request);
      walletCloudIdsRef.current.set(wallet.id, await request);
      pendingWalletCreatesRef.current.delete(wallet.id);
      await refresh();
      return { ok: true };
    } catch (error) {
      pendingWalletCreatesRef.current.delete(wallet.id);
      return reportSaveError(error);
    }
  };

  const updateWallet = async (wallet: Wallet): Promise<SaveResult> => {
    const cloudId = walletCloudIdsRef.current.get(wallet.id);
    if (!cloudId) return reportSaveError(new Error("Wallet is not synchronized."));
    try {
      await updateCloudWallet(cloudId, wallet);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const deleteWallet = async (id: number): Promise<SaveResult> => {
    if (transactions.some((transaction) => transaction.walletId === id)) {
      return reportSaveError(new Error("Delete this wallet's transactions first."));
    }
    const cloudId = walletCloudIdsRef.current.get(id);
    if (!cloudId) return reportSaveError(new Error("Wallet is not synchronized."));
    try {
      await deleteCloudWallet(cloudId);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const addSavingsGoal = async (input: Omit<SavingsGoal, "id" | "status">) => {
    const goal: SavingsGoal = {
      ...input,
      id: Math.max(0, ...savingsGoals.map((item) => item.id)) + 1,
      status: input.currentAmount >= input.targetAmount ? "COMPLETED" : "IN_PROGRESS",
    };
    try {
      savingsGoalCloudIdsRef.current.set(goal.id, await createCloudSavingsGoal(goal));
      await refresh();
      return { ok: true as const, completed: goal.status === "COMPLETED" };
    } catch (error) {
      reportSaveError(error);
      return { ok: false as const, completed: false };
    }
  };

  const changeSavingsGoal = async (id: number, amount: number, direction: "deposit" | "withdraw") => {
    if (amount <= 0) return { ok: false as const, completedNow: false };
    const goal = savingsGoals.find((item) => item.id === id);
    const cloudId = savingsGoalCloudIdsRef.current.get(id);
    if (!goal || !cloudId) {
      reportSaveError(new Error("Savings goal is not synchronized."));
      return { ok: false as const, completedNow: false };
    }
    const nextAmount = direction === "deposit" ? goal.currentAmount + amount : goal.currentAmount - amount;
    const currentAmount = Math.max(0, Math.round(nextAmount * 100) / 100);
    const updated = { ...goal, currentAmount, status: currentAmount >= goal.targetAmount ? "COMPLETED" as const : "IN_PROGRESS" as const };
    try {
      await updateCloudSavingsGoal(cloudId, updated);
      await refresh();
      return { ok: true as const, completedNow: updated.status === "COMPLETED" && goal.status !== "COMPLETED" };
    } catch (error) {
      reportSaveError(error);
      return { ok: false as const, completedNow: false };
    }
  };

  const deleteSavingsGoal = async (id: number): Promise<SaveResult> => {
    const cloudId = savingsGoalCloudIdsRef.current.get(id);
    if (!cloudId) return reportSaveError(new Error("Savings goal is not synchronized."));
    try {
      await deleteCloudSavingsGoal(cloudId);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const addRecurringExpense = async (expense: Omit<RecurringExpense, "id">): Promise<boolean> => {
    const walletId = walletCloudIdsRef.current.get(expense.walletId);
    if (!walletId) {
      reportSaveError(new Error("Recurring expense wallet is not synchronized."));
      return false;
    }
    try {
      await createCloudRecurringExpense({ ...expense, walletId });
      await refresh();
      return true;
    } catch (error) {
      reportSaveError(error);
      return false;
    }
  };

  const updateRecurringExpense = async (id: string, expense: Omit<RecurringExpense, "id">): Promise<boolean> => {
    const walletId = walletCloudIdsRef.current.get(expense.walletId);
    if (!walletId) {
      reportSaveError(new Error("Recurring expense wallet is not synchronized."));
      return false;
    }
    try {
      await updateCloudRecurringExpense(id, { ...expense, walletId });
      await refresh();
      return true;
    } catch (error) {
      reportSaveError(error);
      return false;
    }
  };

  const deleteRecurringExpense = async (id: string) => {
    try {
      await deleteCloudRecurringExpense(id);
      await refresh();
    } catch (error) {
      reportSaveError(error);
    }
  };

  const confirmRecurringExpense = async (occurrenceId: string) => {
    const expense = recurringExpenses.find((item) => `${item.id}:${item.nextDueDate}` === occurrenceId);
    if (!expense) return;
    try {
      await confirmCloudRecurringOccurrence(expense.id, expense.nextDueDate);
      await refresh();
    } catch (error) {
      reportSaveError(error);
    }
  };

  const saveBudget = async (amount: number): Promise<SaveResult> => {
    try {
      await saveCloudBudget(amount);
      await refresh();
      return { ok: true };
    } catch (error) {
      return reportSaveError(error);
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const activeSavings = savingsGoals.filter((goal) => goal.status === "IN_PROGRESS").reduce((sum, goal) => sum + goal.currentAmount, 0);

  return {
    transactions,
    wallets,
    savingsGoals,
    budget,
    recurringExpenses,
    upcomingExpenses: getUpcomingOccurrences(recurringExpenses, new Date()),
    totalBalance,
    availableBalance: Math.max(0, totalBalance - activeSavings),
    loadStatus,
    loadError,
    isReady,
    retryLoad: () => setReloadAttempt((attempt) => attempt + 1),
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addWallet,
    updateWallet,
    deleteWallet,
    addSavingsGoal,
    depositToSavingsGoal: (id: number, amount: number) => changeSavingsGoal(id, amount, "deposit"),
    withdrawFromSavingsGoal: (id: number, amount: number) => changeSavingsGoal(id, amount, "withdraw"),
    deleteSavingsGoal,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    confirmRecurringExpense,
    saveBudget,
  };
}

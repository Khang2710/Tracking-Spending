import type { SavingsGoal, Transaction, Wallet } from "../../types/finance";
import { apiRequest } from "../../services/apiClient";

interface CloudWallet {
  id: string;
  label: string;
  balance: string | number;
  accent: string;
}

interface CloudTransaction {
  id: string;
  wallet_id: string;
  name: string;
  occurred_on: string;
  amount: string | number;
  category: string;
}

interface CloudSavingsGoal {
  id: string;
  title: string;
  target_amount: string | number;
  current_amount: string | number;
  icon: string;
  color: string;
  deadline: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
}

interface CloudBudget {
  id: string;
  amount: string | number;
}

export interface CloudFinanceRows {
  wallets: CloudWallet[];
  transactions: CloudTransaction[];
  savingsGoals: CloudSavingsGoal[];
  budget: CloudBudget | null;
}

export interface MappedCloudFinance {
  wallets: Wallet[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budget: number;
  walletCloudIds: Map<number, string>;
  transactionCloudIds: Map<number, string>;
  savingsGoalCloudIds: Map<number, string>;
  budgetCloudId: string | null;
}

export function monthStartInLocalTime(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function mapCloudFinance(rows: CloudFinanceRows): MappedCloudFinance {
  const walletCloudIds = new Map<number, string>();
  const walletLocalIds = new Map<string, number>();
  const wallets = rows.wallets.map((wallet, index) => {
    const id = index + 1;
    walletCloudIds.set(id, wallet.id);
    walletLocalIds.set(wallet.id, id);
    return {
      id,
      label: wallet.label,
      balance: Number(wallet.balance),
      accent: wallet.accent,
    };
  });

  const transactionCloudIds = new Map<number, string>();
  const transactions = rows.transactions.flatMap((transaction, index) => {
    const walletId = walletLocalIds.get(transaction.wallet_id);
    if (!walletId) return [];
    const id = index + 1;
    transactionCloudIds.set(id, transaction.id);
    return [{
      id,
      walletId,
      name: transaction.name,
      date: transaction.occurred_on,
      amount: Number(transaction.amount),
      category: transaction.category,
    }];
  });

  const savingsGoalCloudIds = new Map<number, string>();
  const savingsGoals = rows.savingsGoals.map((goal, index) => {
    const id = index + 1;
    savingsGoalCloudIds.set(id, goal.id);
    return {
      id,
      title: goal.title,
      targetAmount: Number(goal.target_amount),
      currentAmount: Number(goal.current_amount),
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline ?? "",
      status: goal.status,
    };
  });

  return {
    wallets,
    transactions,
    savingsGoals,
    budget: Number(rows.budget?.amount ?? 0),
    walletCloudIds,
    transactionCloudIds,
    savingsGoalCloudIds,
    budgetCloudId: rows.budget?.id ?? null,
  };
}

export async function loadCloudFinance(): Promise<MappedCloudFinance> {
  const currentMonth = monthStartInLocalTime();
  return mapCloudFinance(await apiRequest<CloudFinanceRows>(
    `/api/finance/workspace?month=${encodeURIComponent(currentMonth)}`,
  ));
}

export async function createCloudWallet(wallet: Omit<Wallet, "id">): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/finance/wallets", {
    method: "POST",
    body: JSON.stringify({
      label: wallet.label,
      balance: wallet.balance,
      accent: wallet.accent,
    }),
  });
  return result.id;
}

export async function updateCloudWallet(id: string, wallet: Omit<Wallet, "id">): Promise<void> {
  await apiRequest(`/api/finance/wallets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      label: wallet.label,
      balance: wallet.balance,
      accent: wallet.accent,
    }),
  });
}

export async function deleteCloudWallet(id: string): Promise<void> {
  await apiRequest(`/api/finance/wallets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createCloudTransaction(transaction: Transaction, walletCloudId: string): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/finance/transactions", {
    method: "POST",
    body: JSON.stringify({
      walletId: walletCloudId,
      name: transaction.name,
      occurredOn: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
    }),
  });
  return result.id;
}

export async function updateCloudTransaction(id: string, transaction: Transaction, walletCloudId: string): Promise<void> {
  await apiRequest(`/api/finance/transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      walletId: walletCloudId,
      name: transaction.name,
      occurredOn: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
    }),
  });
}

export async function deleteCloudTransaction(id: string): Promise<void> {
  await apiRequest(`/api/finance/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveCloudBudget(amount: number, monthStart = monthStartInLocalTime()): Promise<CloudBudget> {
  return apiRequest<CloudBudget>(`/api/finance/budgets/${encodeURIComponent(monthStart)}`, {
    method: "PUT",
    body: JSON.stringify({ amount }),
  });
}

export async function createCloudSavingsGoal(goal: Omit<SavingsGoal, "id">): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/finance/savings-goals", {
    method: "POST",
    body: JSON.stringify({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline,
      status: goal.status,
    }),
  });
  return result.id;
}

export async function updateCloudSavingsGoal(id: string, goal: Omit<SavingsGoal, "id">): Promise<void> {
  await apiRequest(`/api/finance/savings-goals/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline,
      status: goal.status,
    }),
  });
}

export async function deleteCloudSavingsGoal(id: string): Promise<void> {
  await apiRequest(`/api/finance/savings-goals/${encodeURIComponent(id)}`, { method: "DELETE" });
}

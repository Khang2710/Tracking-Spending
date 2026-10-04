import type { SavingsGoal, Transaction, Wallet } from "../../types/finance";
import { apiRequest } from "../../services/apiClient";
import type { RecurringExpense, RecurringFrequency } from "../recurring-expenses/recurring.types";

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
  note?: string | null;
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

interface CloudRecurringExpense {
  id: string;
  wallet_id: string | null;
  title: string;
  amount: string | number;
  category: string;
  cadence: "WEEKLY" | "MONTHLY" | "YEARLY";
  start_on?: string;
  next_due_on: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
  legacy_source_id?: string | null;
  active: boolean;
}

interface CloudRecurringOccurrence {
  id: string;
  recurring_expense_id: string;
  due_on: string;
  status: "PENDING" | "CONFIRMED" | "SKIPPED";
  transaction_id: string | null;
}

export interface CloudFinanceRows {
  wallets: CloudWallet[];
  transactions: CloudTransaction[];
  savingsGoals: CloudSavingsGoal[];
  budget: CloudBudget | null;
  recurringExpenses?: CloudRecurringExpense[];
  recurringOccurrences?: CloudRecurringOccurrence[];
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
  recurringExpenses: RecurringExpense[];
  /** Legacy browser ids that have been durably imported into this account. */
  legacyRecurringSourceIds: Set<string>;
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
      note: transaction.note?.trim() || null,
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

  const legacyRecurringSourceIds = new Set((rows.recurringExpenses ?? []).flatMap((expense) =>
    expense.legacy_source_id ? [expense.legacy_source_id] : [],
  ));
  const recurringExpenses = (rows.recurringExpenses ?? []).flatMap((expense) => {
    const frequency = expense.cadence.toLowerCase() as RecurringFrequency;
    if (!(["weekly", "monthly", "yearly"] as const).includes(frequency)) return [];
    return [{
      id: expense.id,
      name: expense.title,
      expectedAmount: Number(expense.amount),
      dayOfMonth: Number(expense.day_of_month ?? expense.next_due_on.slice(-2)) || 1,
      nextDueDate: expense.next_due_on,
      walletId: expense.wallet_id ? walletLocalIds.get(expense.wallet_id) ?? 0 : 0,
      category: expense.category,
      status: expense.active ? "active" as const : "paused" as const,
      frequency,
      weekday: expense.day_of_week ?? localIsoWeekday(expense.next_due_on),
      monthOfYear: (expense.month_of_year ?? Number(expense.next_due_on.slice(5, 7))) || undefined,
      startDate: expense.start_on ?? expense.next_due_on,
    }];
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
    recurringExpenses,
    legacyRecurringSourceIds,
  };
}

function localIsoWeekday(isoDate: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return undefined;
  const local = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return local.getDay() || 7;
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

type TransactionWrite = Omit<Transaction, "note"> & { note?: string | null };

export async function createCloudTransaction(transaction: TransactionWrite, walletCloudId: string): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/finance/transactions", {
    method: "POST",
    body: JSON.stringify({
      walletId: walletCloudId,
      name: transaction.name,
      occurredOn: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note?.trim() || null,
    }),
  });
  return result.id;
}

export async function updateCloudTransaction(id: string, transaction: TransactionWrite, walletCloudId: string): Promise<void> {
  await apiRequest(`/api/finance/transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      walletId: walletCloudId,
      name: transaction.name,
      occurredOn: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note?.trim() || null,
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

type RecurringExpenseWrite = Omit<RecurringExpense, "id" | "walletId"> & { walletId: string; legacySourceId?: string };

function recurringExpensePayload(expense: RecurringExpenseWrite) {
  const schedule = expense.frequency === "weekly"
    ? { cadence: "WEEKLY", dayOfWeek: expense.weekday }
    : expense.frequency === "yearly"
      ? { cadence: "YEARLY", dayOfMonth: expense.dayOfMonth, monthOfYear: expense.monthOfYear }
      : { cadence: "MONTHLY", dayOfMonth: expense.dayOfMonth };
  return {
    walletId: expense.walletId,
    title: expense.name,
    amount: expense.expectedAmount,
    category: expense.category,
    startOn: expense.startDate,
    nextDueOn: expense.nextDueDate,
    ...schedule,
    ...(expense.legacySourceId ? { legacySourceId: expense.legacySourceId } : {}),
  };
}

export async function createCloudRecurringExpense(expense: RecurringExpenseWrite): Promise<string> {
  const result = await apiRequest<{ id: string }>("/api/finance/recurring-expenses", { method: "POST", body: JSON.stringify(recurringExpensePayload(expense)) });
  return result.id;
}

export async function updateCloudRecurringExpense(id: string, expense: RecurringExpenseWrite): Promise<void> {
  await apiRequest(`/api/finance/recurring-expenses/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(recurringExpensePayload(expense)) });
}

export async function deleteCloudRecurringExpense(id: string): Promise<void> {
  await apiRequest(`/api/finance/recurring-expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function confirmCloudRecurringOccurrence(id: string, dueOn: string): Promise<{ occurrenceId: string; transactionId: string; nextDueOn: string }> {
  return apiRequest(`/api/finance/recurring-expenses/${encodeURIComponent(id)}/occurrences/${encodeURIComponent(dueOn)}/confirm`, { method: "POST" });
}

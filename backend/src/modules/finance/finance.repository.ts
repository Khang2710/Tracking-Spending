import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserSupabaseClient } from "../../infrastructure/supabase.js";
import type { RecurringExpenseInput, SavingsGoalInput, TransactionInput, WalletInput } from "./finance.schemas.js";

interface CloudBudget { id: string; amount: number | string }
interface SupabaseConfig { supabaseUrl: string; supabasePublishableKey: string }
interface RecurringConfirmation { occurrenceId: string; transactionId: string; nextDueOn: string }

export class FinanceNotFoundError extends Error {}
export class FinanceConflictError extends Error {}
/** The app can keep reading old workspaces before deployment, but writes need the additive recurring migration. */
export class FinanceMigrationRequiredError extends Error {}

export interface FinanceService {
  loadWorkspace(accessToken: string, month: string): Promise<unknown>;
  createWallet(accessToken: string, input: WalletInput): Promise<string>;
  updateWallet(accessToken: string, id: string, input: WalletInput): Promise<void>;
  deleteWallet(accessToken: string, id: string): Promise<void>;
  createTransaction(accessToken: string, input: TransactionInput): Promise<string>;
  updateTransaction(accessToken: string, id: string, input: TransactionInput): Promise<void>;
  deleteTransaction(accessToken: string, id: string): Promise<void>;
  saveBudget(accessToken: string, month: string, amount: number): Promise<CloudBudget>;
  createSavingsGoal(accessToken: string, input: SavingsGoalInput): Promise<string>;
  updateSavingsGoal(accessToken: string, id: string, input: SavingsGoalInput): Promise<void>;
  deleteSavingsGoal(accessToken: string, id: string): Promise<void>;
  createRecurringExpense(accessToken: string, input: RecurringExpenseInput): Promise<string>;
  updateRecurringExpense(accessToken: string, id: string, input: RecurringExpenseInput): Promise<void>;
  deleteRecurringExpense(accessToken: string, id: string): Promise<void>;
  confirmRecurringOccurrence(accessToken: string, id: string, dueOn: string): Promise<RecurringConfirmation>;
}

function unwrap<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error?.code === "P0002") throw new FinanceNotFoundError();
  if (result.error?.code === "42703") throw new FinanceMigrationRequiredError();
  if (result.error?.code === "23503" || result.error?.code === "23505") {
    throw new FinanceConflictError();
  }
  if (result.error) throw new Error("Database operation failed");
  return result.data;
}

async function loadAllTransactions(supabase: SupabaseClient) {
  const rows: unknown[] = [];
  const pageSize = 1_000;
  for (let from = 0; from < 100_000; from += pageSize) {
    const result = await supabase
      .from("tracker_transactions")
      .select("id,wallet_id,name,occurred_on,amount,category,note")
      .order("occurred_on", { ascending: false })
      .range(from, from + pageSize - 1);
    const page = unwrap(result) ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error("Transaction history exceeds the supported workspace size");
}

async function loadRecurringExpenses(supabase: SupabaseClient) {
  const extended = await supabase.from("tracker_recurring_expenses")
    .select("id,wallet_id,title,amount,category,cadence,start_on,next_due_on,day_of_week,day_of_month,month_of_year,active,legacy_source_id")
    .order("created_at");
  // The migration is additive. Falling back keeps existing financial workspaces
  // readable until the deployment has applied it, rather than failing all data.
  if (!extended.error || extended.error.code !== "42703") return extended;
  return supabase.from("tracker_recurring_expenses")
    .select("id,wallet_id,title,amount,category,cadence,next_due_on,active")
    .order("created_at");
}

function unwrapSingle<T>(result: { data: T | null; error: { message: string } | null }): T {
  const data = unwrap(result);
  if (data === null) throw new Error("Expected a database record");
  return data;
}

export function createFinanceService(
  config: SupabaseConfig,
  createClient: (token: string) => SupabaseClient = (token) => createUserSupabaseClient(config, token),
): FinanceService {
  const client = (accessToken: string) => createClient(accessToken);
  return {
    async loadWorkspace(accessToken, month) {
      const supabase = client(accessToken);
      const [wallets, transactions, savingsGoals, budget, recurringExpenses, recurringOccurrences] = await Promise.all([
        supabase.from("tracker_wallets").select("id,label,balance,accent").order("created_at"),
        loadAllTransactions(supabase),
        supabase.from("tracker_savings_goals").select("id,title,target_amount,current_amount,icon,color,deadline,status").order("created_at"),
        supabase.from("tracker_monthly_budgets").select("id,amount").eq("month_start", month).maybeSingle(),
        loadRecurringExpenses(supabase),
        supabase.from("tracker_recurring_occurrences").select("id,recurring_expense_id,due_on,status,transaction_id").order("due_on", { ascending: false }),
      ]);
      return {
        wallets: unwrap(wallets) ?? [],
        transactions,
        savingsGoals: unwrap(savingsGoals) ?? [],
        budget: unwrap(budget),
        recurringExpenses: unwrap(recurringExpenses) ?? [],
        recurringOccurrences: unwrap(recurringOccurrences) ?? [],
      };
    },
    async createWallet(accessToken, input) {
      const result = await client(accessToken).from("tracker_wallets").insert(input).select("id").single();
      return unwrapSingle(result).id as string;
    },
    async updateWallet(accessToken, id, input) {
      const result = await client(accessToken).from("tracker_wallets").update(input).eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async deleteWallet(accessToken, id) {
      const result = await client(accessToken).from("tracker_wallets").delete().eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async createTransaction(accessToken, input) {
      const result = await client(accessToken).rpc("tracker_create_transaction", {
        p_wallet_id: input.walletId,
        p_name: input.name,
        p_occurred_on: input.occurredOn,
        p_amount: input.amount,
        p_category: input.category,
        p_note: input.note?.trim() || null,
      });
      return unwrap(result) as string;
    },
    async updateTransaction(accessToken, id, input) {
      unwrap(await client(accessToken).rpc("tracker_update_transaction", {
        p_transaction_id: id,
        p_wallet_id: input.walletId,
        p_name: input.name,
        p_occurred_on: input.occurredOn,
        p_amount: input.amount,
        p_category: input.category,
        p_note: input.note?.trim() || null,
      }));
    },
    async deleteTransaction(accessToken, id) {
      unwrap(await client(accessToken).rpc("tracker_delete_transaction", { p_transaction_id: id }));
    },
    async saveBudget(accessToken, month, amount) {
      const result = await client(accessToken)
        .from("tracker_monthly_budgets")
        .upsert({ month_start: month, amount }, { onConflict: "user_id,month_start" })
        .select("id,amount")
        .single();
      return unwrap(result) as CloudBudget;
    },
    async createSavingsGoal(accessToken, input) {
      const result = await client(accessToken).from("tracker_savings_goals").insert({
        title: input.title,
        target_amount: input.targetAmount,
        current_amount: input.currentAmount,
        icon: input.icon,
        color: input.color,
        deadline: input.deadline || null,
        status: input.status,
      }).select("id").single();
      return unwrapSingle(result).id as string;
    },
    async updateSavingsGoal(accessToken, id, input) {
      const result = await client(accessToken).from("tracker_savings_goals").update({
        title: input.title,
        target_amount: input.targetAmount,
        current_amount: input.currentAmount,
        icon: input.icon,
        color: input.color,
        deadline: input.deadline || null,
        status: input.status,
      }).eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async deleteSavingsGoal(accessToken, id) {
      const result = await client(accessToken).from("tracker_savings_goals").delete().eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async createRecurringExpense(accessToken, input) {
      const result = await client(accessToken).from("tracker_recurring_expenses").insert(recurringRow(input)).select("id").single();
      return unwrapSingle(result).id as string;
    },
    async updateRecurringExpense(accessToken, id, input) {
      const result = await client(accessToken).from("tracker_recurring_expenses").update(recurringRow(input)).eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async deleteRecurringExpense(accessToken, id) {
      const result = await client(accessToken).from("tracker_recurring_expenses").delete().eq("id", id).select("id").maybeSingle();
      if (!unwrap(result)) throw new FinanceNotFoundError();
    },
    async confirmRecurringOccurrence(accessToken, id, dueOn) {
      const result = await client(accessToken).rpc("tracker_confirm_recurring_occurrence", {
        p_recurring_expense_id: id,
        p_due_on: dueOn,
      });
      const row = unwrap(result) as { occurrence_id: string; transaction_id: string; next_due_on: string };
      return { occurrenceId: row.occurrence_id, transactionId: row.transaction_id, nextDueOn: row.next_due_on };
    },
  };
}

function recurringRow(input: RecurringExpenseInput) {
  return {
    wallet_id: input.walletId,
    title: input.title,
    amount: input.amount,
    category: input.category,
    cadence: input.cadence,
    start_on: input.startOn,
    next_due_on: input.nextDueOn,
    day_of_week: input.cadence === "WEEKLY" ? input.dayOfWeek : null,
    day_of_month: input.cadence === "WEEKLY" ? null : input.dayOfMonth,
    month_of_year: input.cadence === "YEARLY" ? input.monthOfYear : null,
    legacy_source_id: input.legacySourceId ?? null,
  };
}

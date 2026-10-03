import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserSupabaseClient } from "../../infrastructure/supabase.js";
import type { SavingsGoalInput, TransactionInput, WalletInput } from "./finance.schemas.js";

interface CloudBudget { id: string; amount: number | string }
interface SupabaseConfig { supabaseUrl: string; supabasePublishableKey: string }

export class FinanceNotFoundError extends Error {}
export class FinanceConflictError extends Error {}

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
}

function unwrap<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
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
      const [wallets, transactions, savingsGoals, budget] = await Promise.all([
        supabase.from("tracker_wallets").select("id,label,balance,accent").order("created_at"),
        loadAllTransactions(supabase),
        supabase.from("tracker_savings_goals").select("id,title,target_amount,current_amount,icon,color,deadline,status").order("created_at"),
        supabase.from("tracker_monthly_budgets").select("id,amount").eq("month_start", month).maybeSingle(),
      ]);
      return {
        wallets: unwrap(wallets) ?? [],
        transactions,
        savingsGoals: unwrap(savingsGoals) ?? [],
        budget: unwrap(budget),
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
  };
}

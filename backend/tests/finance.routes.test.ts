import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createFinanceService, FinanceConflictError, FinanceNotFoundError, type FinanceService } from "../src/modules/finance/finance.repository.js";
import type { SupabaseClient } from "@supabase/supabase-js";

function createFinanceMock(): FinanceService {
  return {
    loadWorkspace: vi.fn().mockResolvedValue({
      wallets: [], transactions: [], savingsGoals: [], budget: null, recurringExpenses: [], recurringOccurrences: [],
    }),
    createWallet: vi.fn().mockResolvedValue("wallet-1"),
    updateWallet: vi.fn().mockResolvedValue(undefined),
    deleteWallet: vi.fn().mockResolvedValue(undefined),
    createTransaction: vi.fn().mockResolvedValue("transaction-1"),
    updateTransaction: vi.fn().mockResolvedValue(undefined),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),
    saveBudget: vi.fn().mockResolvedValue({ id: "budget-1", amount: 500 }),
    createSavingsGoal: vi.fn().mockResolvedValue("goal-1"),
    updateSavingsGoal: vi.fn().mockResolvedValue(undefined),
    deleteSavingsGoal: vi.fn().mockResolvedValue(undefined),
    createRecurringExpense: vi.fn().mockResolvedValue("recurring-1"),
    updateRecurringExpense: vi.fn().mockResolvedValue(undefined),
    deleteRecurringExpense: vi.fn().mockResolvedValue(undefined),
    confirmRecurringOccurrence: vi.fn().mockResolvedValue({ occurrenceId: "occurrence-1", transactionId: "transaction-1", nextDueOn: "2026-11-01" }),
  };
}

const authHeader = { Authorization: "Bearer user-token" };
const validTransaction = {
  walletId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Dinner",
  occurredOn: "2026-09-30",
  amount: -12.5,
  category: "Food",
};

const validRecurringExpense = {
  walletId: "550e8400-e29b-41d4-a716-446655440000",
  title: "Rent",
  amount: 6_000_000,
  category: "Housing",
  cadence: "MONTHLY",
  startOn: "2026-10-01",
  nextDueOn: "2026-10-01",
  dayOfMonth: 1,
};

describe("finance API", () => {
  it("loads the selected month workspace using the authenticated token", async () => {
    const finance = createFinanceMock();
    const app = createApp({
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
      finance,
    });

    await request(app)
      .get("/api/finance/workspace?month=2026-09-01")
      .set(authHeader)
      .expect(200, { wallets: [], transactions: [], savingsGoals: [], budget: null, recurringExpenses: [], recurringOccurrences: [] });

    expect(finance.loadWorkspace).toHaveBeenCalledWith("user-token", "2026-09-01");
  });

  it("rejects an invalid workspace month before querying Supabase", async () => {
    const finance = createFinanceMock();
    const app = createApp({
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
      finance,
    });

    await request(app)
      .get("/api/finance/workspace?month=September")
      .set(authHeader)
      .expect(400, { error: "Invalid request" });
    expect(finance.loadWorkspace).not.toHaveBeenCalled();
  });

  it("creates a transaction with a validated signed amount", async () => {
    const finance = createFinanceMock();
    const app = createApp({
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
      finance,
    });
    const body = {
      walletId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Lunch",
      occurredOn: "2026-09-30",
      amount: -12.5,
      category: "Food",
    };

    await request(app)
      .post("/api/finance/transactions")
      .set(authHeader)
      .send(body)
      .expect(201, { id: "transaction-1" });
    expect(finance.createTransaction).toHaveBeenCalledWith("user-token", { ...body, note: null });
  });

  it("creates and confirms a validated recurring expense through the authenticated service", async () => {
    const finance = createFinanceMock();
    const app = createApp({ extractReceipt: vi.fn(), verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }), finance });

    await request(app).post("/api/finance/recurring-expenses").set(authHeader).send(validRecurringExpense).expect(201, { id: "recurring-1" });
    expect(finance.createRecurringExpense).toHaveBeenCalledWith("user-token", validRecurringExpense);

    await request(app)
      .post("/api/finance/recurring-expenses/550e8400-e29b-41d4-a716-446655440000/occurrences/2026-10-01/confirm")
      .set(authHeader)
      .expect(200, { occurrenceId: "occurrence-1", transactionId: "transaction-1", nextDueOn: "2026-11-01" });
    expect(finance.confirmRecurringOccurrence).toHaveBeenCalledWith("user-token", "550e8400-e29b-41d4-a716-446655440000", "2026-10-01");
  });

  it.each([
    { ...validRecurringExpense, cadence: "WEEKLY" },
    { ...validRecurringExpense, cadence: "WEEKLY", dayOfWeek: 8 },
    { ...validRecurringExpense, cadence: "YEARLY", dayOfMonth: 0, monthOfYear: 2 },
    { ...validRecurringExpense, cadence: "YEARLY", dayOfMonth: 31, monthOfYear: 13 },
    { ...validRecurringExpense, amount: 0 },
  ])("rejects invalid recurring schedules before querying the database", async (body) => {
    const finance = createFinanceMock();
    const app = createApp({ extractReceipt: vi.fn(), verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }), finance });
    await request(app).post("/api/finance/recurring-expenses").set(authHeader).send(body).expect(400, { error: "Invalid request" });
    expect(finance.createRecurringExpense).not.toHaveBeenCalled();
  });

  it.each([
    ["Shared birthday dinner", "Shared birthday dinner"],
    ["  Shared birthday dinner  ", "Shared birthday dinner"],
    [undefined, null],
    [null, null],
    ["", null],
    [" \t\n ", null],
    ["x".repeat(500), "x".repeat(500)],
  ])("accepts and normalizes an optional transaction note (%j)", async (note, expected) => {
    const finance = createFinanceMock();
    const app = createApp({ extractReceipt: vi.fn(), verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }), finance });
    await request(app).post("/api/finance/transactions").set(authHeader)
      .send({ ...validTransaction, note }).expect(201, { id: "transaction-1" });
    expect(finance.createTransaction).toHaveBeenCalledWith("user-token", { ...validTransaction, note: expected });
    await request(app).put(`/api/finance/transactions/${validTransaction.walletId}`).set(authHeader)
      .send({ ...validTransaction, note }).expect(200, { ok: true });
    expect(finance.updateTransaction).toHaveBeenCalledWith("user-token", validTransaction.walletId, { ...validTransaction, note: expected });
  });

  it.each(["x".repeat(501), 123, {}, false])("rejects invalid transaction notes before querying the database (%j)", async (note) => {
    const finance = createFinanceMock();
    const app = createApp({ extractReceipt: vi.fn(), verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }), finance });
    await request(app).post("/api/finance/transactions").set(authHeader)
      .send({ ...validTransaction, note }).expect(400, { error: "Invalid request" });
    await request(app).put(`/api/finance/transactions/${validTransaction.walletId}`).set(authHeader)
      .send({ ...validTransaction, note }).expect(400, { error: "Invalid request" });
    expect(finance.createTransaction).not.toHaveBeenCalled();
    expect(finance.updateTransaction).not.toHaveBeenCalled();
  });

  it("upserts a monthly budget through the authenticated finance service", async () => {
    const finance = createFinanceMock();
    const app = createApp({
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
      finance,
    });

    await request(app)
      .put("/api/finance/budgets/2026-09-01")
      .set(authHeader)
      .send({ amount: 500 })
      .expect(200, { id: "budget-1", amount: 500 });
    expect(finance.saveBudget).toHaveBeenCalledWith("user-token", "2026-09-01", 500);
  });

  it("rejects calendar-invalid transaction dates", async () => {
    const finance = createFinanceMock();
    const app = createApp({
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
      finance,
    });

    await request(app).post("/api/finance/transactions").set(authHeader).send({
      walletId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Impossible",
      occurredOn: "2026-02-31",
      amount: -10,
      category: "Other",
    }).expect(400, { error: "Invalid request" });
    expect(finance.createTransaction).not.toHaveBeenCalled();
  });

  it("maps missing owned records to 404 and business conflicts to 409", async () => {
    const missing = createFinanceMock();
    vi.mocked(missing.updateWallet).mockRejectedValue(new FinanceNotFoundError());
    const conflict = createFinanceMock();
    vi.mocked(conflict.deleteWallet).mockRejectedValue(new FinanceConflictError());
    const dependencies = {
      extractReceipt: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ id: "user-1" }),
    };
    const walletId = "550e8400-e29b-41d4-a716-446655440000";

    await request(createApp({ ...dependencies, finance: missing }))
      .put(`/api/finance/wallets/${walletId}`).set(authHeader)
      .send({ label: "Cash", balance: 0, accent: "black" })
      .expect(404, { error: "Finance record not found" });
    await request(createApp({ ...dependencies, finance: conflict }))
      .delete(`/api/finance/wallets/${walletId}`).set(authHeader)
      .expect(409, { error: "Finance operation conflicts with existing data" });
  });
});

describe("finance transaction persistence", () => {
  it.each([
    [undefined, null], [null, null], ["", null], [" \t\n ", null],
    ["  Shared birthday dinner  ", "Shared birthday dinner"],
  ])("passes normalized notes to both atomic transaction RPCs (%j)", async (note, expected) => {
    const rpc = vi.fn().mockResolvedValue({ data: "transaction-1", error: null });
    const createClient = vi.fn().mockReturnValue({ rpc } as unknown as SupabaseClient);
    const finance = createFinanceService({ supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "public-key" }, createClient);
    const input = { ...validTransaction, note };
    await expect(finance.createTransaction("user-token", input)).resolves.toBe("transaction-1");
    await finance.updateTransaction("user-token", "transaction-1", input);
    const args = { p_wallet_id: validTransaction.walletId, p_name: "Dinner", p_occurred_on: "2026-09-30", p_amount: -12.5, p_category: "Food", p_note: expected };
    expect(rpc).toHaveBeenNthCalledWith(1, "tracker_create_transaction", args);
    expect(rpc).toHaveBeenNthCalledWith(2, "tracker_update_transaction", { ...args, p_transaction_id: "transaction-1" });
    expect(createClient).toHaveBeenCalledWith("user-token");
  });

  it("selects notes when loading the transaction workspace", async () => {
    const transaction = { id: "transaction-1", wallet_id: validTransaction.walletId, name: "Dinner", occurred_on: "2026-09-30", amount: -12.5, category: "Food", note: "Shared birthday dinner" };
    const select = vi.fn();
    const from = vi.fn((table: string) => ({
      select: (columns: string) => {
        select(table, columns);
        return {
          order: () => table === "tracker_transactions"
            ? { range: () => Promise.resolve({ data: [transaction], error: null }) }
            : Promise.resolve({ data: [], error: null }),
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        };
      },
    }));
    const finance = createFinanceService({ supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "public-key" }, () => ({ from } as unknown as SupabaseClient));
    const workspace = await finance.loadWorkspace("user-token", "2026-09-01");
    expect(select).toHaveBeenCalledWith("tracker_transactions", "id,wallet_id,name,occurred_on,amount,category,note");
    expect(workspace).toMatchObject({ transactions: [transaction] });
  });
});

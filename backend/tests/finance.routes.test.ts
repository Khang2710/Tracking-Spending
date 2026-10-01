import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { FinanceConflictError, FinanceNotFoundError, type FinanceService } from "../src/modules/finance/finance.repository.js";

function createFinanceMock(): FinanceService {
  return {
    loadWorkspace: vi.fn().mockResolvedValue({
      wallets: [], transactions: [], savingsGoals: [], budget: null,
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
  };
}

const authHeader = { Authorization: "Bearer user-token" };

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
      .expect(200, { wallets: [], transactions: [], savingsGoals: [], budget: null });

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
    expect(finance.createTransaction).toHaveBeenCalledWith("user-token", body);
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

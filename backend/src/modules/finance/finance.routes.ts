import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/authenticate.js";
import {
  budgetSchema,
  idSchema,
  monthSchema,
  savingsGoalSchema,
  transactionSchema,
  walletSchema,
} from "./finance.schemas.js";
import { FinanceConflictError, FinanceNotFoundError, type FinanceService } from "./finance.repository.js";

function route(handler: (request: AuthenticatedRequest) => Promise<{ status?: number; body?: unknown }> | { status?: number; body?: unknown }): RequestHandler {
  return async (request, response) => {
    try {
      const result = await handler(request);
      response.status(result.status ?? 200).json(result.body ?? null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ error: "Invalid request" });
        return;
      }
      if (error instanceof FinanceNotFoundError) {
        response.status(404).json({ error: "Finance record not found" });
        return;
      }
      if (error instanceof FinanceConflictError) {
        response.status(409).json({ error: "Finance operation conflicts with existing data" });
        return;
      }
      console.error("Finance request failed");
      response.status(500).json({ error: "Finance operation failed" });
    }
  };
}

function token(request: AuthenticatedRequest): string {
  if (!request.auth) throw new Error("Missing authenticated request context");
  return request.auth.accessToken;
}

export function createFinanceRouter(finance: FinanceService) {
  const router = Router();
  router.get("/workspace", route(async (request) => ({
    body: await finance.loadWorkspace(token(request), monthSchema.parse(request.query.month)),
  })));

  router.post("/wallets", route(async (request) => ({
    status: 201,
    body: { id: await finance.createWallet(token(request), walletSchema.parse(request.body)) },
  })));
  router.put("/wallets/:id", route(async (request) => {
    await finance.updateWallet(token(request), idSchema.parse(request.params.id), walletSchema.parse(request.body));
    return { body: { ok: true } };
  }));
  router.delete("/wallets/:id", route(async (request) => {
    await finance.deleteWallet(token(request), idSchema.parse(request.params.id));
    return { body: { ok: true } };
  }));

  router.post("/transactions", route(async (request) => ({
    status: 201,
    body: { id: await finance.createTransaction(token(request), transactionSchema.parse(request.body)) },
  })));
  router.put("/transactions/:id", route(async (request) => {
    await finance.updateTransaction(token(request), idSchema.parse(request.params.id), transactionSchema.parse(request.body));
    return { body: { ok: true } };
  }));
  router.delete("/transactions/:id", route(async (request) => {
    await finance.deleteTransaction(token(request), idSchema.parse(request.params.id));
    return { body: { ok: true } };
  }));

  router.put("/budgets/:month", route(async (request) => {
    const month = monthSchema.parse(request.params.month);
    const { amount } = budgetSchema.parse(request.body);
    return { body: await finance.saveBudget(token(request), month, amount) };
  }));

  router.post("/savings-goals", route(async (request) => ({
    status: 201,
    body: { id: await finance.createSavingsGoal(token(request), savingsGoalSchema.parse(request.body)) },
  })));
  router.put("/savings-goals/:id", route(async (request) => {
    await finance.updateSavingsGoal(token(request), idSchema.parse(request.params.id), savingsGoalSchema.parse(request.body));
    return { body: { ok: true } };
  }));
  router.delete("/savings-goals/:id", route(async (request) => {
    await finance.deleteSavingsGoal(token(request), idSchema.parse(request.params.id));
    return { body: { ok: true } };
  }));
  return router;
}

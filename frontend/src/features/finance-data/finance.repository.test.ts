import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock("../../services/apiClient", () => ({ apiRequest: apiRequestMock }));

import { createCloudSavingsGoal, createCloudTransaction, createCloudWallet, deleteCloudTransaction, mapCloudFinance, monthStartInLocalTime, updateCloudTransaction } from "./finance.repository";

beforeEach(() => apiRequestMock.mockReset());

describe("mapCloudFinance", () => {
  it("maps UUID-backed cloud rows to the numeric IDs used by the current UI", () => {
    const data = mapCloudFinance({
      wallets: [
        { id: "wallet-a", label: "Cash", balance: "120000", accent: "#111111" },
      ],
      transactions: [
        {
          id: "transaction-a",
          wallet_id: "wallet-a",
          name: "Coffee",
          occurred_on: "2026-09-30",
          amount: "-35000",
          category: "Drinks",
          note: "Shared birthday dinner",
        },
      ],
      savingsGoals: [],
      budget: null,
    });

    expect(data.wallets).toEqual([
      { id: 1, label: "Cash", balance: 120000, accent: "#111111" },
    ]);
    expect(data.transactions).toEqual([
      {
        id: 1,
        walletId: 1,
        name: "Coffee",
        date: "2026-09-30",
        amount: -35000,
        category: "Drinks",
        note: "Shared birthday dinner",
      },
    ]);
    expect(data.walletCloudIds.get(1)).toBe("wallet-a");
    expect(data.transactionCloudIds.get(1)).toBe("transaction-a");
  });

  it.each([undefined, null, "", " \t\n "])("maps legacy or blank cloud notes to null (%j)", (note) => {
    const data = mapCloudFinance({
      wallets: [{ id: "wallet-a", label: "Cash", balance: 10, accent: "#111" }],
      transactions: [{ id: "transaction-a", wallet_id: "wallet-a", name: "Dinner", occurred_on: "2026-09-30", amount: -10, category: "Food", note }],
      savingsGoals: [],
      budget: null,
    });
    expect(data.transactions[0]?.note).toBeNull();
  });
});

describe("monthStartInLocalTime", () => {
  it("uses the displayed local month when saving a monthly budget", () => {
    expect(monthStartInLocalTime(new Date(2026, 8, 30, 23, 0))).toBe("2026-09-01");
  });
});

describe("finance write contracts", () => {
  it("strips runtime ids from wallet and savings-goal create payloads", async () => {
    apiRequestMock.mockResolvedValueOnce({ id: "wallet-a" });
    const wallet = { id: 99, label: "Cash", balance: 10, accent: "#111" };
    await createCloudWallet(wallet);
    expect(JSON.parse(apiRequestMock.mock.calls[0]?.[1]?.body)).toEqual({
      label: "Cash", balance: 10, accent: "#111",
    });

    apiRequestMock.mockResolvedValueOnce({ id: "goal-a" });
    const goal = {
      id: 77,
      title: "Trip",
      targetAmount: 100,
      currentAmount: 10,
      icon: "plane",
      color: "green",
      deadline: "2026-12-01",
      status: "IN_PROGRESS",
    } as const;
    await createCloudSavingsGoal(goal);
    expect(JSON.parse(apiRequestMock.mock.calls[1]?.[1]?.body)).toEqual({
      title: "Trip",
      targetAmount: 100,
      currentAmount: 10,
      icon: "plane",
      color: "green",
      deadline: "2026-12-01",
      status: "IN_PROGRESS",
    });
  });
});

describe("createCloudTransaction", () => {
  it("sends one transaction command to the backend", async () => {
    apiRequestMock.mockResolvedValueOnce({ id: "transaction-a" });

    await expect(createCloudTransaction({
      id: 1,
      walletId: 1,
      name: "Coffee",
      date: "2026-09-30",
      amount: -35000,
      category: "Drinks",
      note: "Shared birthday dinner",
    }, "wallet-a")).resolves.toBe("transaction-a");

    expect(apiRequestMock).toHaveBeenCalledWith("/api/finance/transactions", {
      method: "POST",
      body: JSON.stringify({
        walletId: "wallet-a",
        name: "Coffee",
        occurredOn: "2026-09-30",
        amount: -35000,
        category: "Drinks",
        note: "Shared birthday dinner",
      }),
    });
  });
});

describe("transaction mutation RPCs", () => {
  const transaction = {
    id: 1,
    walletId: 1,
    name: "Coffee",
    date: "2026-09-30",
    amount: -35000,
    category: "Drinks",
    note: "Shared birthday dinner",
  };

  it("updates a transaction through the backend", async () => {
    apiRequestMock.mockResolvedValueOnce({ ok: true });

    await expect(updateCloudTransaction("transaction-a", transaction, "wallet-a")).resolves.toBeUndefined();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/finance/transactions/transaction-a", {
      method: "PUT",
      body: JSON.stringify({
        walletId: "wallet-a",
        name: "Coffee",
        occurredOn: "2026-09-30",
        amount: -35000,
        category: "Drinks",
        note: "Shared birthday dinner",
      }),
    });
  });

  it("deletes a transaction through the backend", async () => {
    apiRequestMock.mockResolvedValueOnce({ ok: true });

    await expect(deleteCloudTransaction("transaction-a")).resolves.toBeUndefined();

    expect(apiRequestMock).toHaveBeenCalledWith("/api/finance/transactions/transaction-a", {
      method: "DELETE",
    });
  });
});

describe("transaction note payload normalization", () => {
  it.each([
    [undefined, null],
    [null, null],
    ["", null],
    [" \t\n ", null],
    ["  Shared birthday dinner  ", "Shared birthday dinner"],
  ])("normalizes note %j to %j for create and update", async (note, expected) => {
    const transaction = { id: 1, walletId: 1, name: "Dinner", date: "2026-09-30", amount: -10, category: "Food", note };
    apiRequestMock.mockResolvedValueOnce({ id: "transaction-a" }).mockResolvedValueOnce({ ok: true });
    await createCloudTransaction(transaction, "wallet-a");
    await updateCloudTransaction("transaction-a", transaction, "wallet-a");
    for (const [, options] of apiRequestMock.mock.calls) {
      expect(JSON.parse(options.body)).toMatchObject({ note: expected });
    }
  });
});

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { CurrencyProvider } from "../../context/CurrencyContext";
import en from "../../locales/en";
import type { MappedCloudFinance } from "../finance-data/finance.repository";

const { loadCloudFinance, createCloudTransaction, authUser } = vi.hoisted(() => ({
  loadCloudFinance: vi.fn(),
  createCloudTransaction: vi.fn(),
  authUser: { id: "user-1" },
}));

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock("../../lib/supabase", () => ({
  supabase: { from: () => ({ upsert: () => Promise.resolve({ error: null }) }) },
}));
vi.mock("../finance-data/finance.repository", async (importOriginal) => ({
  ...await importOriginal<typeof import("../finance-data/finance.repository")>(),
  loadCloudFinance,
  createCloudTransaction,
}));

function workspace(): MappedCloudFinance {
  return {
    wallets: [
      { id: 3, label: "Cash", balance: 250_000, accent: "#746783" },
      { id: 8, label: "Bank", balance: 500_000, accent: "#4F7D62" },
    ],
    transactions: [],
    savingsGoals: [],
    budget: 0,
    walletCloudIds: new Map([[3, "wallet-cloud-3"], [8, "wallet-cloud-8"]]),
    transactionCloudIds: new Map(),
    savingsGoalCloudIds: new Map(),
    budgetCloudId: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

async function openMobileTransaction() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } } });
  render(<I18nextProvider i18n={i18n}><CurrencyProvider><App /></CurrencyProvider></I18nextProvider>);
  const user = userEvent.setup();
  const mobileNavigation = await screen.findByRole("navigation", { name: "Điều hướng di động" });
  await user.click(within(mobileNavigation).getByRole("button", { name: "Quick actions" }));
  await user.click(within(screen.getByRole("dialog", { name: "Quick actions" })).getByRole("button", { name: "New Transaction" }));
  const sheet = screen.getByRole("dialog", { name: "New Transaction" });
  await user.type(within(sheet).getByLabelText("Description"), "Taxi");
  await user.type(within(sheet).getByLabelText("Amount"), "45000");
  await user.selectOptions(within(sheet).getByLabelText("Wallet"), "8");
  await user.clear(within(sheet).getByLabelText("Transaction date"));
  await user.type(within(sheet).getByLabelText("Transaction date"), "2026-10-02");
  await user.click(within(sheet).getByRole("button", { name: "Add note" }));
  await user.type(within(sheet).getByLabelText("Note"), "  Taxi home  ");
  return { user, sheet };
}

describe("mobile New Transaction App flow", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("wealthy_user_name", "Test user");
    loadCloudFinance.mockReset().mockResolvedValue(workspace());
    createCloudTransaction.mockReset().mockResolvedValue("transaction-cloud-12");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("sends the normalized note and closes only after creation and workspace refresh succeed", async () => {
    const creation = deferred<string>();
    const refresh = deferred<MappedCloudFinance>();
    createCloudTransaction.mockReturnValueOnce(creation.promise);
    loadCloudFinance.mockResolvedValueOnce(workspace()).mockReturnValueOnce(refresh.promise);
    const { user, sheet } = await openMobileTransaction();

    await user.click(within(sheet).getByRole("button", { name: "Save Transaction" }));

    expect(createCloudTransaction).toHaveBeenCalledExactlyOnceWith({
      id: 0, name: "Taxi", amount: -45000, category: "Fuel", date: "2026-10-02", walletId: 8, note: "Taxi home",
    }, "wallet-cloud-8");
    expect(loadCloudFinance).toHaveBeenCalledTimes(1);
    expect(sheet).toBeInTheDocument();

    await act(async () => creation.resolve("transaction-cloud-12"));
    expect(loadCloudFinance).toHaveBeenCalledTimes(2);
    expect(sheet).toBeInTheDocument();

    const refreshed = workspace();
    refreshed.wallets[1].balance = 455_000;
    refreshed.transactions = [{
      id: 12, name: "Taxi", amount: -45000, category: "Fuel", date: "2026-10-02", walletId: 8, note: "Taxi home",
    }];
    refreshed.transactionCloudIds.set(12, "transaction-cloud-12");
    await act(async () => refresh.resolve(refreshed));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "New Transaction" })).not.toBeInTheDocument());
    expect(screen.getAllByText("Taxi").length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem("wealthy_v2_transactions")!)).toEqual(refreshed.transactions);
    const cachedWallets = JSON.parse(localStorage.getItem("wealthy_v2_wallets")!);
    expect(cachedWallets[0].balance).toBe(250_000);
    expect(cachedWallets[1].balance).toBe(455_000);
  });

  it.each(["creation", "refresh"] as const)("keeps the sheet and note available when %s fails", async (stage) => {
    const failure = new Error(`${stage} failed`);
    vi.spyOn(console, "error").mockImplementation(() => {});
    if (stage === "creation") createCloudTransaction.mockRejectedValueOnce(failure);
    else loadCloudFinance.mockResolvedValueOnce(workspace()).mockRejectedValueOnce(failure);
    const { user, sheet } = await openMobileTransaction();

    await user.click(within(sheet).getByRole("button", { name: "Save Transaction" }));

    await waitFor(() => expect(screen.getByText("Cloud data could not be saved. Please try again.")).toBeInTheDocument());
    expect(sheet).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Note")).toHaveValue("  Taxi home  ");
    expect(within(sheet).getByLabelText("Description")).toHaveValue("Taxi");
    expect(loadCloudFinance).toHaveBeenCalledTimes(stage === "creation" ? 1 : 2);
    expect(JSON.parse(localStorage.getItem("wealthy_v2_transactions")!)).toEqual([]);
  });
});

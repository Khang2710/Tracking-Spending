/**
 * Frontend Sync Service - Migrates localStorage data to Spring Boot Backend API
 */

export interface SyncResult {
  migrated: boolean;
  message?: string;
  totalRecordsSynced?: number;
}

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:8080";

export async function syncLocalDataToCloud(accessToken: string): Promise<SyncResult> {
  if (!accessToken) return { migrated: false };

  // Check if migration has already been completed
  if (localStorage.getItem("is_migrated") === "true") {
    return { migrated: false };
  }

  let wallets: any[] = [];
  let transactions: any[] = [];
  let savingsGoals: any[] = [];
  let splitBills: any[] = [];

  try {
    const rawWallets = localStorage.getItem("wealthy_v2_wallets");
    if (rawWallets) wallets = JSON.parse(rawWallets);

    const rawTxs = localStorage.getItem("wealthy_v2_transactions");
    if (rawTxs) transactions = JSON.parse(rawTxs);

    const rawGoals = localStorage.getItem("wealthy_v2_savings_goals");
    if (rawGoals) savingsGoals = JSON.parse(rawGoals);

    const rawBills = localStorage.getItem("wealthy_v2_saved_bills");
    if (rawBills) splitBills = JSON.parse(rawBills);
  } catch (e) {
    console.error("[Sync] Error parsing local storage data:", e);
  }

  // If no data to migrate, mark as migrated and return
  if (wallets.length === 0 && transactions.length === 0 && savingsGoals.length === 0 && splitBills.length === 0) {
    localStorage.setItem("is_migrated", "true");
    return { migrated: false };
  }

  const payload = {
    wallets: wallets.map((w) => ({ name: w.label || w.name, balance: w.balance || 0 })),
    transactions: transactions.map((t) => ({
      amount: t.amount,
      type: t.type || (t.amount > 0 ? "INCOME" : "OUTCOME"),
      category: t.category || "General",
      date: t.date || new Date().toISOString(),
    })),
    savingsGoals: savingsGoals.map((g) => ({
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      icon: g.icon,
      color: g.color,
      deadline: g.deadline,
      status: g.status || "IN_PROGRESS",
    })),
    splitBills: splitBills.map((b) => ({
      totalAmount: b.totalAmount || b.amount || 0,
      createdAt: b.createdAt || b.date || new Date().toISOString(),
    })),
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/sync/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("is_migrated", "true");

      // Clean up old local storage items
      localStorage.removeItem("wealthy_v2_wallets");
      localStorage.removeItem("wealthy_v2_transactions");
      localStorage.removeItem("wealthy_v2_savings_goals");
      localStorage.removeItem("wealthy_v2_saved_bills");

      return {
        migrated: true,
        message: data.message || "Bulk migration completed successfully",
        totalRecordsSynced: data.totalRecordsSynced || 0,
      };
    }
  } catch (e) {
    console.error("[Sync] Failed to post bulk sync to server:", e);
  }

  return { migrated: false };
}

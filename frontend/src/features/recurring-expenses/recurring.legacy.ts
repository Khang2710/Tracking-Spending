import type { RecurringExpense } from "./recurring.types";

export function readLegacyRecurringExpenses(): RecurringExpense[] {
  try {
    const saved = localStorage.getItem("wealthy_v2_recurring_expenses");
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const item = value as Partial<RecurringExpense>;
      const expectedAmount = Number(item.expectedAmount);
      const dayOfMonth = Math.min(31, Math.max(1, Number(item.dayOfMonth) || 1));
      if (!item.id || !item.name?.trim() || !Number.isFinite(expectedAmount) || expectedAmount <= 0 || !item.nextDueDate) return [];

      return [{
        id: item.id,
        name: item.name.trim(),
        expectedAmount,
        dayOfMonth,
        nextDueDate: item.nextDueDate,
        walletId: Number(item.walletId) || 0,
        category: item.category?.trim() || "Others",
        status: item.status === "paused" ? "paused" : "active",
        frequency: item.frequency ?? "monthly",
        weekday: item.weekday,
        monthOfYear: item.monthOfYear,
        startDate: item.startDate ?? item.nextDueDate,
      }];
    });
  } catch (error) {
    console.error("Error reading legacy recurring expenses", error);
    return [];
  }
}

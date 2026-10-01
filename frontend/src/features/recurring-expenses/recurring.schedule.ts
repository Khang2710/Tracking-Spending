import type { RecurringExpense, RecurringOccurrence } from "./recurring.types";

export function advanceMonthlyDueDate(dueDate: string, dayOfMonth: number): string {
  const current = parseIsoDate(dueDate);
  if (!current) return dueDate;

  const nextYear = current.getMonth() === 11 ? current.getFullYear() + 1 : current.getFullYear();
  const nextMonth = (current.getMonth() + 1) % 12;
  const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  return formatIsoDate(new Date(nextYear, nextMonth, Math.min(Math.max(dayOfMonth, 1), lastDay)));
}

export function getOccurrenceId(expense: RecurringExpense): string {
  return `${expense.id}:${expense.nextDueDate}`;
}

export function getUpcomingOccurrences(
  expenses: RecurringExpense[],
  now: Date,
  horizonDays = 14,
): RecurringOccurrence[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + Math.max(horizonDays, 0));

  return expenses
    .filter((expense) => expense.status === "active")
    .flatMap((expense) => {
      const dueDate = parseIsoDate(expense.nextDueDate);
      if (!dueDate || dueDate > horizon) return [];
      return [{
        occurrenceId: getOccurrenceId(expense),
        recurringExpenseId: expense.id,
        name: expense.name,
        expectedAmount: expense.expectedAmount,
        dueDate: expense.nextDueDate,
        walletId: expense.walletId,
        category: expense.category,
        status: "upcoming" as const,
      }];
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

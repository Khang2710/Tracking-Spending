import type { RecurringExpense, RecurringOccurrence } from "./recurring.types";

export function advanceMonthlyDueDate(dueDate: string, dayOfMonth: number): string {
  const current = parseIsoDate(dueDate);
  if (!current) return dueDate;

  const nextYear = current.getMonth() === 11 ? current.getFullYear() + 1 : current.getFullYear();
  const nextMonth = (current.getMonth() + 1) % 12;
  const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
  return formatIsoDate(new Date(nextYear, nextMonth, Math.min(Math.max(dayOfMonth, 1), lastDay)));
}

export function advanceRecurringDueDate(expense: RecurringExpense): string {
  const current = parseIsoDate(expense.nextDueDate);
  if (!current) return expense.nextDueDate;

  if (expense.frequency === "weekly") {
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
    return formatIsoDate(next);
  }

  if (expense.frequency === "yearly") {
    const targetYear = current.getFullYear() + 1;
    const targetMonth = Math.min(12, Math.max(1, expense.monthOfYear ?? current.getMonth() + 1)) - 1;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    return formatIsoDate(new Date(targetYear, targetMonth, Math.min(Math.max(expense.dayOfMonth, 1), lastDay)));
  }

  return advanceMonthlyDueDate(expense.nextDueDate, expense.dayOfMonth);
}

/**
 * Finds the first local calendar occurrence on or after both the schedule's
 * start date and today. Date-only strings deliberately avoid UTC parsing so a
 * due date does not move a day for users west of UTC.
 */
export function getFirstUpcomingDueDate(
  expense: Pick<RecurringExpense, "frequency" | "weekday" | "dayOfMonth" | "monthOfYear" | "startDate">,
  now = new Date(),
): string {
  const start = parseIsoDate(expense.startDate) ?? startOfLocalDay(now);
  const today = startOfLocalDay(now);
  const floor = start > today ? start : today;

  if (expense.frequency === "weekly") {
    const desiredWeekday = Math.min(7, Math.max(1, expense.weekday ?? 1));
    const currentWeekday = isoWeekday(floor);
    const offset = (desiredWeekday - currentWeekday + 7) % 7;
    return formatIsoDate(new Date(floor.getFullYear(), floor.getMonth(), floor.getDate() + offset));
  }

  if (expense.frequency === "yearly") {
    const month = Math.min(12, Math.max(1, expense.monthOfYear ?? floor.getMonth() + 1)) - 1;
    const inThisYear = scheduledDate(floor.getFullYear(), month, expense.dayOfMonth);
    return formatIsoDate(inThisYear >= floor ? inThisYear : scheduledDate(floor.getFullYear() + 1, month, expense.dayOfMonth));
  }

  const inThisMonth = scheduledDate(floor.getFullYear(), floor.getMonth(), expense.dayOfMonth);
  return formatIsoDate(inThisMonth >= floor ? inThisMonth : scheduledDate(floor.getFullYear(), floor.getMonth() + 1, expense.dayOfMonth));
}

export function getOccurrenceId(expense: RecurringExpense): string {
  return `${expense.id}:${expense.nextDueDate}`;
}

export function getUpcomingOccurrences(
  expenses: RecurringExpense[],
  now: Date,
  horizonDays?: number,
): RecurringOccurrence[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = horizonDays === undefined ? null : new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.max(horizonDays, 0));

  return expenses
    .filter((expense) => expense.status === "active")
    .flatMap((expense) => {
      const dueDate = parseIsoDate(expense.nextDueDate);
      if (!dueDate || (horizon && dueDate > horizon)) return [];
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

function scheduledDate(year: number, month: number, dayOfMonth: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(dayOfMonth, 1), lastDay));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoWeekday(date: Date): number {
  return date.getDay() || 7;
}

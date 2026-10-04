export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export interface RecurringExpense {
  id: string;
  name: string;
  /** Stored in the application's canonical currency amount. */
  expectedAmount: number;
  dayOfMonth: number;
  nextDueDate: string;
  walletId: number;
  category: string;
  status: "active" | "paused";
  frequency: RecurringFrequency;
  /** ISO weekday: Monday is 1, Sunday is 7. Required for weekly schedules. */
  weekday?: number;
  /** Calendar month from 1–12. Required for yearly schedules. */
  monthOfYear?: number;
  /** Local calendar date used as the recurrence anchor. */
  startDate: string;
}

export interface RecurringOccurrence {
  occurrenceId: string;
  recurringExpenseId: string;
  name: string;
  expectedAmount: number;
  dueDate: string;
  walletId: number;
  category: string;
  status: "upcoming" | "paid" | "skipped";
  transactionId?: number;
}

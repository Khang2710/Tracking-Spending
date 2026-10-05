export interface RecurringExpense {
  id: string;
  name: string;
  expectedAmount: number;
  dayOfMonth: number;
  nextDueDate: string;
  walletId: number;
  category: string;
  status: "active" | "paused";
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

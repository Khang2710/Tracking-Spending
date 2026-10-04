import { describe, expect, it } from "vitest";
import type { RecurringExpense } from "./recurring.types";
import {
  advanceRecurringDueDate,
  advanceMonthlyDueDate,
  getOccurrenceId,
  getUpcomingOccurrences,
} from "./recurring.schedule";

const rent: RecurringExpense = {
  id: "rent",
  name: "Tiền nhà",
  expectedAmount: 6_000_000,
  dayOfMonth: 31,
  nextDueDate: "2026-09-30",
  walletId: 1,
  category: "Housing",
  status: "active",
  frequency: "monthly",
  startDate: "2026-01-31",
};

describe("advanceMonthlyDueDate", () => {
  it("clamps a monthly due date to the last valid day", () => {
    expect(advanceMonthlyDueDate("2026-01-31", 31)).toBe("2026-02-28");
    expect(advanceMonthlyDueDate("2028-01-31", 31)).toBe("2028-02-29");
  });
});

describe("advanceRecurringDueDate", () => {
  it("keeps weekly schedules on their chosen weekday", () => {
    expect(advanceRecurringDueDate({ ...rent, frequency: "weekly", weekday: 1, nextDueDate: "2026-10-05" })).toBe("2026-10-12");
  });

  it("uses the last valid day for monthly schedules", () => {
    expect(advanceRecurringDueDate({ ...rent, frequency: "monthly", dayOfMonth: 31, nextDueDate: "2026-01-31" })).toBe("2026-02-28");
  });

  it("keeps an annual month and clamps leap-day schedules", () => {
    expect(advanceRecurringDueDate({ ...rent, frequency: "yearly", monthOfYear: 2, dayOfMonth: 29, nextDueDate: "2028-02-29" })).toBe("2029-02-28");
  });
});

describe("getUpcomingOccurrences", () => {
  it("shows only the next due period for each active recurring expense", () => {
    const weekly = { ...rent, id: "weekly", frequency: "weekly" as const, weekday: 5, nextDueDate: "2026-10-02" };
    const yearly = { ...rent, id: "yearly", frequency: "yearly" as const, monthOfYear: 10, nextDueDate: "2026-10-15" };

    expect(getUpcomingOccurrences([weekly, yearly], new Date(2026, 9, 1), 60)).toEqual(expect.arrayContaining([
      expect.objectContaining({ recurringExpenseId: "weekly", dueDate: "2026-10-02" }),
      expect.objectContaining({ recurringExpenseId: "yearly", dueDate: "2026-10-15" }),
    ]));
  });

  it("keeps the next active bill visible on Home even when it is more than two weeks away", () => {
    const nextMonth = { ...rent, id: "next-month", nextDueDate: "2026-11-01" };
    expect(getUpcomingOccurrences([nextMonth], new Date(2026, 9, 4))).toEqual([
      expect.objectContaining({ recurringExpenseId: "next-month", dueDate: "2026-11-01" }),
    ]);
  });
});

describe("getUpcomingOccurrences", () => {
  it("includes overdue and near-term active expenses in due-date order", () => {
    const phone: RecurringExpense = { ...rent, id: "phone", name: "Điện thoại", dayOfMonth: 5, nextDueDate: "2026-10-05" };
    const paused: RecurringExpense = { ...rent, id: "paused", nextDueDate: "2026-10-01", status: "paused" };

    expect(getUpcomingOccurrences([phone, paused, rent], new Date(2026, 8, 30), 7).map((item) => item.recurringExpenseId)).toEqual(["rent", "phone"]);
  });

  it("uses a stable id for duplicate-payment protection", () => {
    expect(getOccurrenceId(rent)).toBe("rent:2026-09-30");
  });
});

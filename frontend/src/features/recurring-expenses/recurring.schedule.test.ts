import { describe, expect, it } from "vitest";
import type { RecurringExpense } from "./recurring.types";
import {
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
};

describe("advanceMonthlyDueDate", () => {
  it("clamps a monthly due date to the last valid day", () => {
    expect(advanceMonthlyDueDate("2026-01-31", 31)).toBe("2026-02-28");
    expect(advanceMonthlyDueDate("2028-01-31", 31)).toBe("2028-02-29");
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

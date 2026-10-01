import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyStatisticsDashboard, type StatisticsCopy } from "./MonthlyStatisticsDashboard";

const copy: StatisticsCopy = { monthlyBreakdown: "Monthly breakdown", netBalance: "Net balance", income: "Income", spending: "Spending", savings: "Savings", spendingFocus: "Spending focus", whereMoneyWent: "Where money went", spendingPercent: "of spending", monthlySnapshot: "Monthly snapshot", quietMonth: "Quiet month", transactions: "Transactions", averageExpense: "Average expense", monthlyBudget: "Monthly budget", dailyLimit: "Daily limit", saved: "Saved", atAGlance: "At a glance", savingsRate: "Savings rate", categories: "Categories", noExpenses: "No expenses" };

describe("MonthlyStatisticsDashboard", () => {
  it("renders selected month values and empty category state", () => {
    render(<MonthlyStatisticsDashboard monthLabel="October" monthShortLabel="Oct" year={2026} income={650} spending={12} savings={638} budget={120} budgetPercent={10} dailyLimit={4} savedBudget={108} transactionCount={1} averageExpense={12} categories={[]} formatCurrency={(value) => `$${value}`} copy={copy} />);
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByText("+$638")).toBeInTheDocument();
    expect(screen.getByText("No expenses")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("/ $120")).toBeInTheDocument();
  });
});

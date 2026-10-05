import { useState } from "react";
import { motion } from "motion/react";
import { BarChart2, Calendar, PiggyBank } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { C } from "../../design/tokens";
import type { SavingsGoal, Transaction, Wallet } from "../../types/finance";
import { categoryColors } from "../transactions/categories";
import CashFlowCalendar from "./CashFlowCalendar";
import { MonthSelector } from "./MonthSelector";
import { MonthlyStatisticsDashboard } from "./MonthlyStatisticsDashboard";
import { SavingsGoalsScreen } from "../savings-goals/SavingsGoalsScreen";
import { buildYearlyChartData, getTransactionsForMonth } from "./statistics.selectors";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// ─── STATISTICS SCREEN ────────────────────────────────────────────────────────
interface StatisticsScreenProps {
  wallets: Wallet[];
  transactions: Transaction[];
  budget: number;
  savingsGoals: SavingsGoal[];
  availableBalance: number;
  totalBalance: number;
  onAddGoalClick: () => void;
  onDeposit: (goalId: number, amount: number) => void;
  onWithdraw: (goalId: number, amount: number) => void;
  onDeleteGoal: (goalId: number) => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction?: (tx: Transaction) => void;
}


export function StatisticsScreen({
  wallets,
  transactions,
  budget,
  savingsGoals,
  availableBalance,
  totalBalance,
  onAddGoalClick,
  onDeposit,
  onWithdraw,
  onDeleteGoal,
  onDeleteTransaction,
  onEditTransaction,
}: StatisticsScreenProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [statsSubTab, setStatsSubTab] = useState<number>(0);
  const selectedYear = new Date().getFullYear();

  const computedChartData = buildYearlyChartData(transactions, selectedYear);

  const activeMonthData = computedChartData[selectedMonth] || { income: 0, outcome: 0, savings: 0 };

  // Calculate dynamic budget details for the selected month
  const monthTransactions = getTransactionsForMonth(transactions, selectedMonth, selectedYear);
  const totalMonthOutcome = monthTransactions.reduce(
    (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
    0
  );
  const pctSpent = budget > 0 ? Math.min(Math.round((totalMonthOutcome / budget) * 100), 100) : 0;
  const saved = Math.max(0, budget - totalMonthOutcome);

  // Dynamic spending categories for selected month
  const categoryTotals: Record<string, number> = {};
  let monthTotalExpenses = 0;
  monthTransactions.forEach((t) => {
    if (t.amount < 0) {
      const amt = Math.abs(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
      monthTotalExpenses += amt;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([name, amount]) => {
      const pct = monthTotalExpenses > 0 ? Math.round((amount / monthTotalExpenses) * 100) : 0;
      return {
        name,
        amount,
        pct,
        color: categoryColors[name] || categoryColors.Others,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="px-5 pt-2 pb-5 md:hidden">
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{ color: C.white }}
        >
          Statistics
        </h1>
      </div>

      {/* Segmented Switcher */}
      <div className="px-5 md:px-0 pb-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {[
            { id: 0, label: t("stats.tabStats"), shortLabel: t("stats.tabStats"), icon: BarChart2 },
            { id: 1, label: t("stats.tabCashFlow"), shortLabel: t("stats.tabCashFlowShort"), icon: Calendar },
            { id: 2, label: t("stats.tabSavings"), shortLabel: t("stats.tabSavingsShort"), icon: PiggyBank },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = statsSubTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => setStatsSubTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer text-center relative whitespace-nowrap min-w-0"
                style={{
                  background: isActive ? C.gold : "transparent",
                  color: isActive ? C.bg : C.tm,
                  boxShadow: isActive ? "0 2px 10px rgba(201, 164, 91, 0.25)" : "none",
                }}
              >
                <IconComp size={14} strokeWidth={2.2} className="shrink-0" />
                <span className="truncate sm:hidden">{tab.shortLabel}</span>
                <span className="hidden truncate sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {statsSubTab === 1 && (
        <div className="px-5 md:px-0 pb-6">
          <CashFlowCalendar
            transactions={transactions}
            wallets={wallets}
            onDeleteTransaction={onDeleteTransaction}
            onEditTransaction={onEditTransaction}
          />
        </div>
      )}

      {statsSubTab === 2 && (
        <div className="px-5 md:px-0 pb-6">
          <SavingsGoalsScreen
            goals={savingsGoals}
            availableBalance={availableBalance}
            totalBalance={totalBalance}
            onAddGoalClick={onAddGoalClick}
            onDeposit={onDeposit}
            onWithdraw={onWithdraw}
            onDelete={onDeleteGoal}
          />
        </div>
      )}

      {statsSubTab === 0 && (
        <div className="space-y-4 px-4 pb-6 sm:px-5 md:px-0">
          <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} months={months} year={selectedYear} />
          <MonthlyStatisticsDashboard
            monthLabel={new Date(selectedYear, selectedMonth, 1).toLocaleString(undefined, { month: "long" })}
            monthShortLabel={months[selectedMonth]}
            year={selectedYear}
            income={activeMonthData.income}
            spending={activeMonthData.outcome}
            savings={activeMonthData.savings}
            budget={budget}
            budgetPercent={pctSpent}
            dailyLimit={budget / 30}
            savedBudget={saved}
            transactionCount={monthTransactions.length}
            averageExpense={monthTotalExpenses > 0 ? monthTotalExpenses / monthTransactions.filter((transaction) => transaction.amount < 0).length : 0}
            categories={sortedCategories.map(({ name, amount, pct, color }) => ({ name, amount, pct, color }))}
            formatCurrency={formatCurrency}
            copy={{
              monthlyBreakdown: t("stats.monthlyBreakdown"), netBalance: t("stats.netBalance"), income: t("stats.income"), spending: t("stats.outcome"), savings: t("stats.savings"), spendingFocus: t("stats.spendingFocus"), whereMoneyWent: t("stats.mostMoneyGoesTo"), spendingPercent: t("stats.spendingPercent"), monthlySnapshot: t("stats.monthlySnapshot"), quietMonth: t("stats.quietMonth"), transactions: t("stats.transactions"), averageExpense: t("stats.averageExpense"), monthlyBudget: t("stats.monthlyBudget"), dailyLimit: t("stats.dailyLimit"), saved: t("stats.saved"), atAGlance: t("stats.atAGlance"), savingsRate: t("stats.savingsRate"), categories: t("stats.categories"), noExpenses: t("stats.noExpenses"),
            }}
          />
        </div>
      )}
    </div>
  );
}

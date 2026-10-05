import { useState } from "react";
import type { Transaction, Wallet } from "../../types/finance";
import type { RecurringOccurrence } from "../recurring-expenses/recurring.types";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { ActiveWallets } from "./ActiveWallets";
import { MonthlyBudgetCard } from "./MonthlyBudgetCard";
import { RecentTransactions } from "./RecentTransactions";
import { formatHomeDate, getMonthlyBudgetSummary, getRecentTransactions } from "./home.selectors";
import { PriorityInsightCard } from "../insights/PriorityInsightCard";
import { UpcomingExpensesSheet } from "../insights/UpcomingExpensesSheet";

export interface HomeScreenProps {
  wallets: Wallet[];
  transactions: Transaction[];
  budget: number;
  now?: Date;
  onEditBudget: () => void;
  onAddTransaction: () => void;
  onAddWallet: () => void;
  onEditWallet: (wallet: Wallet) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: number) => void;
  upcomingExpenses?: RecurringOccurrence[];
  onConfirmRecurring?: (occurrenceId: string) => void;
  onConfigureRecurring?: () => void;
}

export function HomeScreen({
  wallets,
  transactions,
  budget,
  now = new Date(),
  onEditBudget,
  onAddTransaction,
  onAddWallet,
  onEditWallet,
  onEditTransaction,
  onDeleteTransaction,
  upcomingExpenses = [],
  onConfirmRecurring = () => undefined,
  onConfigureRecurring = () => undefined,
}: HomeScreenProps) {
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);
  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState(false);
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();
  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const budgetSummary = getMonthlyBudgetSummary(transactions, budget, now);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now);
  const recentTransactions = getRecentTransactions(transactions, 6);

  const actionableInsights = upcomingExpenses.slice(0, 3);

  return (
    <main className="w-full px-4 pb-28 pt-5 sm:px-6 md:px-10 md:pb-10 md:pt-8">
      <header className="mb-5 flex items-end justify-between gap-4 md:mb-7">
        <h1 className="whitespace-nowrap text-[27px] font-extrabold leading-tight tracking-[-0.04em] text-[var(--paper-ink)] sm:text-[34px]">
          {formatHomeDate(now, locale)}
        </h1>
        <button
          type="button"
          onClick={onAddTransaction}
          className="hidden min-h-10 items-center gap-2 rounded-full bg-[var(--paper-ink)] px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-90 md:inline-flex"
        >
          <Plus size={15} />
          {t("dashboard.newTransaction", "Thêm giao dịch")}
        </button>
      </header>

      <div className="min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_300px] min-[1180px]:items-start min-[1180px]:gap-x-8">
      <div className="space-y-5 md:space-y-7 min-[1180px]:col-start-1">
          <MonthlyBudgetCard
            monthLabel={monthLabel}
            summary={budgetSummary}
            formatCurrency={formatCurrency}
            onEdit={onEditBudget}
            labels={{
              title: t("dashboard.monthlyBudget"),
              edit: t("common.edit"),
              spent: locale.startsWith("vi") ? "Đã chi trong tháng" : "Spent this month",
              dailyAverage: t("dashboard.dailyAvg"),
              dailyLimit: t("dashboard.limit"),
              daysLeft: t("dashboard.daysLeft"),
              setup: locale.startsWith("vi") ? "Thiết lập" : "Set up",
            }}
          />

          <ActiveWallets
            wallets={wallets}
            formatCurrency={formatCurrency}
            locale={locale}
            title={t("dashboard.activeWallets")}
            addLabel={t("common.add")}
            emptyLabel={t("dashboard.noWallets")}
            createLabel={locale.startsWith("vi") ? "Tạo ví đầu tiên" : "Create first wallet"}
            onAdd={onAddWallet}
            onEdit={onEditWallet}
          />

        <section className="min-[1180px]:hidden" aria-labelledby="financial-insights-mobile-title">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 id="financial-insights-mobile-title" className="text-[18px] font-extrabold tracking-[-0.03em] text-[var(--paper-ink)]">Financial Insights</h2>
              <button type="button" onClick={() => setIsUpcomingOpen(true)} className="text-[11px] font-bold text-[var(--paper-muted)] hover:text-[var(--paper-ink)]">{locale.startsWith("vi") ? "Xem tất cả" : "View all"}</button>
            </div>
            {actionableInsights.length > 0 ? <div className="space-y-2">{actionableInsights.map((occurrence) => <PriorityInsightCard key={occurrence.occurrenceId} occurrence={occurrence} formatCurrency={formatCurrency} locale={locale} onOpen={() => setIsUpcomingOpen(true)} />)}</div> : <div className="paper-surface rounded-[20px] p-4"><p className="text-[13px] font-semibold text-[var(--paper-ink)]">{locale.startsWith("vi") ? "Chưa có khoản chi cố định." : "No recurring expenses yet."}</p><p className="mt-1 text-[12px] font-medium text-[var(--paper-muted)]">{locale.startsWith("vi") ? "Thiết lập tiền nhà, điện thoại hoặc các khoản cần nhắc hàng tháng." : "Set up rent, phone, or other monthly reminders."}</p><button type="button" onClick={onConfigureRecurring} className="mt-3 text-[12px] font-bold text-[var(--paper-ink)] underline underline-offset-4">{locale.startsWith("vi") ? "Thiết lập khoản chi" : "Set up recurring expenses"}</button></div>}
          </section>
      </div>

      <div className="mt-5 min-[1180px]:contents">
        <div className="min-[1180px]:mt-7">
        <RecentTransactions
            transactions={recentTransactions}
            formatCurrency={formatCurrency}
            title={t("dashboard.recentTransactions")}
            emptyLabel={t("dashboard.noTransactions")}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
        />
        </div>
        <aside className={`hidden min-[1180px]:col-start-2 min-[1180px]:row-start-1 min-[1180px]:row-span-2 min-[1180px]:block ${isInsightsCollapsed ? "w-11" : "w-full"}`} aria-labelledby="financial-insights-title">
            {isInsightsCollapsed ? (
              <button type="button" onClick={() => setIsInsightsCollapsed(false)} aria-label={locale.startsWith("vi") ? "Mở Financial Insights" : "Expand Financial Insights"} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--paper-border)] bg-white text-[var(--paper-muted)] hover:text-[var(--paper-ink)]"><ChevronLeft size={18} /></button>
            ) : (
              <section className="paper-surface rounded-[20px] p-3.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--paper-warning)]">{locale.startsWith("vi") ? "Cần xử lý" : "Action needed"}</p>
                    <h2 id="financial-insights-title" className="mt-0.5 text-[15px] font-extrabold tracking-[-0.025em] text-[var(--paper-ink)]">Financial Insights</h2>
                  </div>
                  <button type="button" onClick={() => setIsInsightsCollapsed(true)} aria-label={locale.startsWith("vi") ? "Thu gọn Financial Insights" : "Collapse Financial Insights"} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--paper-muted)] hover:bg-[var(--paper-sage-soft)] hover:text-[var(--paper-ink)]"><ChevronRight size={16} /></button>
                </div>
                {actionableInsights.length > 0 ? <div className="divide-y divide-[var(--paper-border)]">{actionableInsights.map((occurrence) => (
                    <button key={occurrence.occurrenceId} type="button" onClick={() => setIsUpcomingOpen(true)} className="flex w-full items-center gap-2.5 py-3 text-left first:pt-0 last:pb-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--paper-sage-soft)] text-[var(--paper-ink)]"><CalendarClock size={15} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-[var(--paper-ink)]">{occurrence.name}</span><span className="mt-0.5 block text-[10px] font-semibold text-[var(--paper-muted)]">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${occurrence.dueDate}T12:00:00`))}</span></span>
                      <span className="money-figure text-[11px] font-extrabold text-[var(--paper-ink)]">{formatCurrency(occurrence.expectedAmount)}</span>
                    </button>
                  ))}</div> : <div className="rounded-[14px] bg-[var(--paper-canvas)] p-3"><p className="text-[12px] font-bold text-[var(--paper-ink)]">{locale.startsWith("vi") ? "Chưa có khoản chi cố định" : "No recurring expenses"}</p><button type="button" onClick={onConfigureRecurring} className="mt-2 text-[11px] font-bold text-[var(--paper-muted)] underline underline-offset-4">{locale.startsWith("vi") ? "Thiết lập ngay" : "Set up now"}</button></div>}
                {actionableInsights.length > 0 ? <button type="button" onClick={() => setIsUpcomingOpen(true)} className="mt-3 w-full text-left text-[11px] font-bold text-[var(--paper-muted)] hover:text-[var(--paper-ink)]">{locale.startsWith("vi") ? "Xem tất cả" : "View all"}</button> : null}
              </section>
            )}
          </aside>
      </div>
      </div>
      {isUpcomingOpen ? (
        <UpcomingExpensesSheet
          occurrences={upcomingExpenses}
          formatCurrency={formatCurrency}
          locale={locale}
          onClose={() => setIsUpcomingOpen(false)}
          onConfirm={(occurrenceId) => {
            onConfirmRecurring(occurrenceId);
            setIsUpcomingOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}

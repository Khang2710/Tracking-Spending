import { TrendingDown, WalletCards } from "lucide-react";
import { SvgTrendChart, type TrendDatum } from "./SvgTrendChart";

export interface StatisticsCategorySummary {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

export interface StatisticsCopy {
  monthlyBreakdown: string;
  netBalance: string;
  income: string;
  spending: string;
  savings: string;
  spendingFocus: string;
  whereMoneyWent: string;
  spendingPercent: string;
  monthlySnapshot: string;
  quietMonth: string;
  transactions: string;
  averageExpense: string;
  monthlyBudget: string;
  dailyLimit: string;
  saved: string;
  atAGlance: string;
  savingsRate: string;
  categories: string;
  noExpenses: string;
}

interface MonthlyStatisticsDashboardProps {
  monthLabel: string;
  monthShortLabel: string;
  year: number;
  income: number;
  spending: number;
  savings: number;
  budget: number;
  budgetPercent: number;
  dailyLimit: number;
  savedBudget: number;
  transactionCount: number;
  averageExpense: number;
  categories: StatisticsCategorySummary[];
  formatCurrency: (value: number) => string;
  copy: StatisticsCopy;
}

export function MonthlyStatisticsDashboard(props: MonthlyStatisticsDashboardProps) {
  const { copy } = props;
  const net = props.income - props.spending;
  const savingsRate = props.income > 0 ? Math.max(0, Math.round((props.savings / props.income) * 100)) : 0;
  const topCategory = props.categories[0];
  const chartData: TrendDatum[] = [{ m: props.monthShortLabel, income: props.income, outcome: props.spending, savings: props.savings }];
  const metrics = [
    { label: copy.income, value: props.income, color: "#4F7D62" },
    { label: copy.spending, value: props.spending, color: "#A75D4D" },
    { label: copy.savings, value: props.savings, color: "#191B17" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section className="relative overflow-hidden rounded-[26px] border border-[var(--paper-border)] bg-white p-4 shadow-[0_24px_65px_rgba(42,45,39,0.065)] sm:p-6 lg:col-span-8">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#4f7d62_0_34%,#a75d4d_34%_66%,#191b17_66%)] opacity-80" />
        <header className="flex items-end justify-between gap-4">
          <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--paper-muted)]">{props.monthLabel} {props.year}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.035em] sm:text-2xl">{copy.monthlyBreakdown}</h2></div>
          <div className="text-right"><p className="text-[11px] font-bold text-[var(--paper-muted)]">{copy.netBalance}</p><p className="money-figure text-xl font-extrabold tracking-tight sm:text-2xl">{net >= 0 ? "+" : "−"}{props.formatCurrency(Math.abs(net))}</p></div>
        </header>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
          {metrics.map((metric) => <article key={metric.label} className="relative min-h-[72px] overflow-hidden rounded-[15px] border border-[var(--paper-border)] bg-[var(--paper-surface)] p-2.5 sm:min-h-[86px] sm:rounded-[17px] sm:p-4"><div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--paper-muted)] sm:gap-2 sm:text-[12px]"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: metric.color }} />{metric.label}</div><p className="money-figure mt-2 text-[18px] font-extrabold tracking-[-0.04em] sm:text-[23px]">{props.formatCurrency(metric.value)}</p><div className="absolute inset-x-2.5 bottom-0 h-[3px] rounded-t-full sm:inset-x-4" style={{ background: metric.color }} /></article>)}
        </div>
        <div className="mt-6 h-[190px] border-t border-[var(--paper-border)] pt-5 sm:h-[210px]"><SvgTrendChart data={chartData} formatValue={props.formatCurrency} focusIndex={0} labels={{ income: copy.income, spending: copy.spending, savings: copy.savings }} /></div>
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
        <section className="rounded-[24px] border border-[var(--paper-border)] bg-white p-5 shadow-[0_18px_48px_rgba(42,45,39,0.055)]">
          <div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#a75d4d]">{copy.spendingFocus}</p><h3 className="mt-1 text-lg font-extrabold tracking-tight">{copy.whereMoneyWent}</h3></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0eb] text-[#a75d4d]"><TrendingDown size={17} /></div></div>
          {topCategory ? <div className="rounded-[17px] bg-[var(--paper-surface)] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold">{topCategory.name}</p><p className="mt-0.5 text-[10px] font-semibold text-[var(--paper-muted)]">{topCategory.pct}% {copy.spendingPercent}</p></div><p className="money-figure text-sm font-extrabold text-[#a75d4d]">−{props.formatCurrency(topCategory.amount)}</p></div><div className="mt-4 h-2 rounded-full bg-[#e7e6df]"><div className="h-full rounded-full" style={{ width: `${topCategory.pct}%`, background: topCategory.color }} /></div></div> : <p className="rounded-[17px] bg-[var(--paper-surface)] p-5 text-sm font-semibold text-[var(--paper-muted)]">{copy.noExpenses}</p>}
        </section>
        <section className="rounded-[24px] border border-[var(--paper-border)] bg-white p-5 shadow-[0_18px_48px_rgba(42,45,39,0.055)]">
          <div className="flex items-start justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--paper-muted)]">{copy.monthlySnapshot}</p><h3 className="mt-1 text-lg font-extrabold">{copy.quietMonth}</h3></div><WalletCards size={20} className="text-[var(--paper-muted)]" /></div>
          <div className="mt-7 grid grid-cols-2 gap-5"><div><p className="text-[12px] font-semibold text-[var(--paper-muted)]">{copy.transactions}</p><p className="mt-1 text-2xl font-extrabold">{props.transactionCount}</p></div><div><p className="text-[12px] font-semibold text-[var(--paper-muted)]">{copy.averageExpense}</p><p className="money-figure mt-1 text-2xl font-extrabold">{props.formatCurrency(props.averageExpense)}</p></div></div>
        </section>
      </aside>

      <section className="rounded-[24px] border border-[var(--paper-border)] bg-white p-5 shadow-[0_18px_48px_rgba(42,45,39,0.05)] sm:p-6 lg:col-span-8">
        <div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--paper-muted)]">{copy.monthlyBudget}</p><p className="money-figure mt-1 text-[27px] font-extrabold tracking-[-0.04em]">{props.formatCurrency(props.spending)} <span className="text-sm font-semibold text-[var(--paper-muted)]">/ {props.formatCurrency(props.budget)}</span></p></div><span className="rounded-full bg-[var(--paper-surface)] px-2.5 py-1 text-[10px] font-extrabold">{props.budgetPercent}%</span></div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#ecece7]"><div className="h-full rounded-full bg-[#4f7d62] transition-[width]" style={{ width: `${props.budgetPercent}%` }} /></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-[12px] font-semibold text-[var(--paper-muted)]"><span>{copy.dailyLimit}: {props.formatCurrency(props.dailyLimit)}</span><span className="font-extrabold text-[#4f7d62]">{copy.saved} {props.formatCurrency(props.savedBudget)}</span></div>
      </section>

      <section className="rounded-[24px] border border-[var(--paper-border)] bg-white p-5 shadow-[0_18px_48px_rgba(42,45,39,0.05)] sm:p-6 lg:col-span-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--paper-muted)]">{copy.atAGlance}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><p className="text-xl font-extrabold">{savingsRate}%</p><p className="text-[11px] font-bold text-[var(--paper-muted)]">{copy.savingsRate}</p></div><div className="border-x border-[var(--paper-border)]"><p className="money-figure text-xl font-extrabold">{props.formatCurrency(props.averageExpense)}</p><p className="text-[11px] font-bold text-[var(--paper-muted)]">{copy.averageExpense}</p></div><div><p className="text-xl font-extrabold">{props.categories.length}</p><p className="text-[11px] font-bold text-[var(--paper-muted)]">{copy.categories}</p></div></div>
      </section>
    </div>
  );
}

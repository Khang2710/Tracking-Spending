import { AlertTriangle, ArrowUpRight, Pencil } from "lucide-react";
import type { MonthlyBudgetSummary } from "./home.selectors";

interface MonthlyBudgetCardProps {
  monthLabel: string;
  summary: MonthlyBudgetSummary;
  formatCurrency: (amount: number) => string;
  onEdit: () => void;
  labels: {
    title: string;
    edit: string;
    spent: string;
    dailyAverage: string;
    dailyLimit: string;
    daysLeft: string;
    setup: string;
    overBudget: string;
    budgetWarning: string;
  };
}

export function MonthlyBudgetCard({
  monthLabel,
  summary,
  formatCurrency,
  onEdit,
  labels,
}: MonthlyBudgetCardProps) {
  const isOver = summary.rawPercent >= 100;
  const isWarning = summary.rawPercent >= 80;
  const progressColor = isOver
    ? "var(--paper-expense)"
    : isWarning
      ? "var(--paper-warning)"
      : "var(--paper-action)";

  return (
    <section className="paper-surface overflow-hidden rounded-[24px] p-5 sm:p-6" aria-labelledby="monthly-budget-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[13px] font-semibold text-[var(--paper-muted)]">{monthLabel}</p>
          <h2 id="monthly-budget-title" className="text-[19px] font-bold tracking-[-0.025em] text-[var(--paper-ink)]">
            {labels.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--paper-border)] bg-[var(--paper-sand-soft)] px-3.5 text-[13px] font-bold text-[var(--paper-ink)] transition-colors duration-200 hover:bg-[var(--paper-sand)]"
          aria-label={summary.limit > 0 ? labels.edit : labels.setup}
        >
          <Pencil size={14} aria-hidden="true" />
          {summary.limit > 0 ? `${summary.percent}%` : labels.setup}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="money-figure text-[32px] font-extrabold leading-none text-[var(--paper-ink)] sm:text-[38px]">
          {formatCurrency(summary.spent)}
        </span>
        <span className="money-figure pb-0.5 text-[15px] font-semibold text-[var(--paper-subtle)]">
          / {formatCurrency(summary.limit)}
        </span>
      </div>
      <p className="mt-2 text-[12px] font-medium text-[var(--paper-muted)]">{labels.spent}</p>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ECEBE6]" aria-label={`${summary.percent}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${summary.percent}%`, background: progressColor }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--paper-border)] pt-4 sm:grid-cols-3">
        <BudgetMetric label={labels.dailyAverage} value={formatCurrency(summary.dailyAverage)} />
        <BudgetMetric label={labels.dailyLimit} value={formatCurrency(summary.dailyLimit)} />
        <div className="col-span-2 sm:col-span-1">
          <BudgetMetric label={labels.daysLeft} value={String(summary.daysLeft)} emphasized />
        </div>
      </div>

      {isWarning ? (
        <div className={`mt-4 flex items-start gap-2 rounded-2xl px-3.5 py-3 text-[12px] font-semibold ${isOver ? "bg-[#F8E9E5] text-[var(--paper-expense)]" : "bg-[#F8F0E3] text-[var(--paper-warning)]"}`}>
          {isOver ? <AlertTriangle size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}
          <span>{isOver ? labels.overBudget : labels.budgetWarning}</span>
        </div>
      ) : null}
    </section>
  );
}

function BudgetMetric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--paper-subtle)]">{label}</p>
      <p className={`money-figure mt-1 text-[14px] font-bold ${emphasized ? "text-[var(--paper-ink)]" : "text-[var(--paper-muted)]"}`}>{value}</p>
    </div>
  );
}

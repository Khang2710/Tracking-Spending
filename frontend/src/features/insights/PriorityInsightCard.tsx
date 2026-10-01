import { CalendarClock, ChevronRight } from "lucide-react";
import type { RecurringOccurrence } from "../recurring-expenses/recurring.types";

export function PriorityInsightCard({ occurrence, formatCurrency, locale, onOpen }: { occurrence: RecurringOccurrence; formatCurrency: (amount: number) => string; locale: string; onOpen: () => void }) {
  const dueDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${occurrence.dueDate}T12:00:00`));
  const label = locale.startsWith("vi") ? `Sắp đến hạn · ${dueDate}` : `Upcoming · ${dueDate}`;

  return (
    <button type="button" onClick={onOpen} aria-label={`${occurrence.name}, ${label}`} className="paper-surface flex w-full items-center gap-3 rounded-[20px] p-4 text-left transition-colors hover:bg-[var(--paper-sage-soft)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--paper-sage-soft)] text-[var(--paper-ink)]"><CalendarClock size={20} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-[var(--paper-warning)]">{label}</span>
        <span className="mt-1 block truncate text-[14px] font-extrabold text-[var(--paper-ink)]">{occurrence.name}</span>
        <span className="money-figure mt-0.5 block text-[12px] font-semibold text-[var(--paper-muted)]">{formatCurrency(occurrence.expectedAmount)}</span>
      </span>
      <ChevronRight size={18} className="text-[var(--paper-muted)]" aria-hidden="true" />
    </button>
  );
}

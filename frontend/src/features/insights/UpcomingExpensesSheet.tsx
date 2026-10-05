import { CalendarClock, Check, X } from "lucide-react";
import type { RecurringOccurrence } from "../recurring-expenses/recurring.types";

export function UpcomingExpensesSheet({ occurrences, formatCurrency, locale, onClose, onConfirm }: { occurrences: RecurringOccurrence[]; formatCurrency: (amount: number) => string; locale: string; onClose: () => void; onConfirm: (occurrenceId: string) => void }) {
  const isVi = locale.startsWith("vi");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171A16]/35 p-3 backdrop-blur-[2px]" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="upcoming-expenses-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_30px_80px_rgba(23,26,22,0.24)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[var(--paper-warning)]">{isVi ? "CẦN XÁC NHẬN" : "NEEDS CONFIRMATION"}</p>
            <h2 id="upcoming-expenses-title" className="mt-1 text-[21px] font-extrabold tracking-[-0.03em]">{isVi ? "Khoản chi sắp tới" : "Upcoming expenses"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={isVi ? "Đóng" : "Close"} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-sage-soft)]"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="mt-5 space-y-3">
          {occurrences.map((occurrence) => (
            <article key={occurrence.occurrenceId} className="rounded-[18px] border border-[var(--paper-border)] bg-[var(--paper-canvas)] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white"><CalendarClock size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold">{occurrence.name}</h3>
                  <p className="mt-1 text-[11px] font-semibold text-[var(--paper-muted)]">{occurrence.dueDate}</p>
                </div>
                <p className="money-figure text-[14px] font-extrabold">{formatCurrency(occurrence.expectedAmount)}</p>
              </div>
              <button type="button" onClick={() => onConfirm(occurrence.occurrenceId)} aria-label={isVi ? `Xác nhận đã trả ${occurrence.name}` : `Confirm ${occurrence.name} paid`} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--paper-action)] text-[12px] font-bold text-white">
                <Check size={16} aria-hidden="true" />{isVi ? "Đã thanh toán" : "Mark as paid"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

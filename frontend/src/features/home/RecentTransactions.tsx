import { Coffee, Landmark, Pencil, Plus, ShoppingBag, Trash2, UtensilsCrossed } from "lucide-react";
import type { Transaction } from "../../types/finance";

const icons = {
  Food: UtensilsCrossed,
  Drinks: Coffee,
  Shopping: ShoppingBag,
  Bank: Landmark,
};

export function RecentTransactions({
  transactions,
  formatCurrency,
  emptyLabel,
  title,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  emptyLabel: string;
  title: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: number) => void;
}) {
  return (
    <section aria-labelledby="recent-transactions-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-transactions-title" className="text-[19px] font-extrabold tracking-[-0.025em] text-[var(--paper-ink)]">{title}</h2>
      </div>
      <div className="paper-surface overflow-hidden rounded-[22px]">
        {transactions.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--paper-sage-soft)]"><Plus size={20} aria-hidden="true" /></span>
            <p className="mt-3 text-[13px] font-semibold text-[var(--paper-muted)]">{emptyLabel}</p>
          </div>
        ) : transactions.map((transaction) => {
          const Icon = icons[transaction.category as keyof typeof icons] ?? ShoppingBag;
          const isIncome = transaction.amount >= 0;
          return (
            <article key={transaction.id} className="group flex items-center gap-3 border-b border-[var(--paper-border)] px-4 py-3.5 last:border-b-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--paper-sage-soft)] text-[var(--paper-muted)]"><Icon size={18} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[14px] font-bold text-[var(--paper-ink)]">{transaction.name}</h3>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--paper-subtle)]">{transaction.category} · {transaction.date}</p>
              </div>
              <div className="text-right">
                <p className={`money-figure text-[14px] font-extrabold ${isIncome ? "text-[var(--paper-income)]" : "text-[var(--paper-ink)]"}`}>
                  {isIncome ? "+" : "−"}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                <span className="sr-only">{isIncome ? "Income" : "Expense"}</span>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <button type="button" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--paper-muted)] transition-colors hover:bg-[var(--paper-sage-soft)] hover:text-[var(--paper-ink)]"><Pencil size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => onDelete(transaction.id)} aria-label={`Delete ${transaction.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--paper-muted)] transition-colors hover:bg-[#F8E9E5] hover:text-[var(--paper-expense)]"><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

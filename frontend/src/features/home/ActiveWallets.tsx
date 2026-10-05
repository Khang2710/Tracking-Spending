import { CreditCard } from "lucide-react";
import type { Wallet } from "../../types/finance";
import { WalletCard } from "./WalletCard";

export function ActiveWallets({
  wallets,
  formatCurrency,
  locale,
  title,
  addLabel,
  emptyLabel,
  createLabel,
  onAdd,
  onEdit,
}: {
  wallets: Wallet[];
  formatCurrency: (amount: number) => string;
  locale: string;
  title: string;
  addLabel: string;
  emptyLabel: string;
  createLabel: string;
  onAdd: () => void;
  onEdit: (wallet: Wallet) => void;
}) {
  return (
    <section aria-labelledby="active-wallets-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="active-wallets-title" className="text-[19px] font-extrabold tracking-[-0.025em] text-[var(--paper-ink)]">{title}</h2>
        <button type="button" onClick={onAdd} className="min-h-11 rounded-full px-3 text-[13px] font-bold text-[var(--paper-muted)] transition-colors hover:bg-white hover:text-[var(--paper-ink)]">+ {addLabel}</button>
      </div>
      {wallets.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--paper-border)] bg-white/55 px-5 py-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[15px] bg-[var(--paper-sand-soft)]"><CreditCard size={21} aria-hidden="true" /></span>
          <p className="mx-auto mt-3 max-w-sm text-[13px] font-semibold text-[var(--paper-muted)]">{emptyLabel}</p>
          <button type="button" onClick={onAdd} className="mt-4 min-h-11 rounded-full bg-[var(--paper-action)] px-5 text-[13px] font-bold text-white">{createLabel}</button>
        </div>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} formatCurrency={formatCurrency} locale={locale} onClick={() => onEdit(wallet)} />
          ))}
        </div>
      )}
    </section>
  );
}

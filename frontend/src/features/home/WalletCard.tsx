import { Banknote, Landmark, WalletCards } from "lucide-react";
import type { Wallet } from "../../types/finance";

interface WalletCardProps {
  wallet: Wallet;
  formatCurrency: (amount: number) => string;
  locale: string;
  onClick: () => void;
}

export function WalletCard({ wallet, formatCurrency, locale, onClick }: WalletCardProps) {
  const normalized = wallet.label.toLocaleLowerCase(locale);
  const isCash = /cash|tiền mặt/.test(normalized);
  const isBank = /bank|ngân hàng|checking|savings/.test(normalized);
  const Icon = isCash ? Banknote : isBank ? Landmark : WalletCards;
  const iconLabel = locale.startsWith("vi")
    ? isCash ? "Ví tiền mặt" : isBank ? "Tài khoản ngân hàng" : "Ví chính"
    : isCash ? "Cash wallet" : isBank ? "Bank account" : "Main wallet";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${iconLabel}: ${wallet.label}`}
      className="paper-surface group min-w-[176px] flex-1 rounded-[20px] p-4 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#CFCFC6] hover:shadow-[0_18px_42px_rgba(42,45,39,0.09)]"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${isCash ? "bg-[var(--paper-sand-soft)]" : "bg-[var(--paper-sage-soft)]"}`}>
        <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="mt-5 block text-[12px] font-semibold text-[var(--paper-muted)]">{wallet.label}</span>
      <span className="money-figure mt-1.5 block text-[18px] font-extrabold text-[var(--paper-ink)]">{formatCurrency(wallet.balance)}</span>
    </button>
  );
}

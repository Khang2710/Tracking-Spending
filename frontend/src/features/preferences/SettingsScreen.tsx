import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { RecurringExpensesSettings } from "../recurring-expenses/RecurringExpensesSettings";
import type { RecurringExpense } from "../recurring-expenses/recurring.types";
import type { Wallet } from "../../types/finance";
import { CurrencyToggle, LanguageToggle } from "./PreferenceToggles";

interface SettingsScreenProps {
  userName: string;
  expenses: RecurringExpense[];
  wallets: Wallet[];
  onEditProfile: () => void;
  onAddRecurring: (expense: Omit<RecurringExpense, "id">) => Promise<boolean>;
  onUpdateRecurring: (id: string, expense: Omit<RecurringExpense, "id">) => Promise<boolean>;
  onDeleteRecurring: (id: string) => void;
}

export function SettingsScreen({
  userName,
  expenses,
  wallets,
  onEditProfile,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
}: SettingsScreenProps) {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();
  const isVietnamese = i18n.language?.startsWith("vi");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">
      <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-[var(--paper-ink)]">{t("menu.settings")}</h1>
      <p className="mt-2 text-sm font-medium text-[var(--paper-muted)]">
        {isVietnamese ? "Tùy chỉnh trải nghiệm và kết nối của bạn." : "Customize your experience and connections."}
      </p>
      <div className="paper-surface mt-6 grid gap-5 rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--paper-border)] pb-5">
          <div>
            <h2 className="text-base font-bold text-[var(--paper-ink)]">{isVietnamese ? "Ngôn ngữ & tiền tệ" : "Language & currency"}</h2>
            <p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{isVietnamese ? "Cách số tiền và nội dung được hiển thị." : "How amounts and content are displayed."}</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--paper-action)] p-2"><CurrencyToggle /><LanguageToggle /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--paper-ink)]">{isVietnamese ? "Hồ sơ & tích hợp" : "Profile & integrations"}</h2>
            <p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{userName || (isVietnamese ? "Chưa đặt tên" : "No name set")}</p>
          </div>
          <button type="button" onClick={onEditProfile} className="min-h-11 rounded-full border border-[var(--paper-border)] px-4 text-xs font-bold text-[var(--paper-ink)]">
            {isVietnamese ? "Sửa hồ sơ" : "Edit profile"}
          </button>
        </div>
      </div>
      <div className="mt-5">
        <RecurringExpensesSettings
          expenses={expenses}
          wallets={wallets}
          locale={isVietnamese ? "vi-VN" : "en-US"}
          formatCurrency={formatCurrency}
          onAdd={onAddRecurring}
          onUpdate={onUpdateRecurring}
          onDelete={onDeleteRecurring}
        />
      </div>
    </main>
  );
}

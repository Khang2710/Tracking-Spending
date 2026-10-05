import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import type { Transaction, Wallet } from "../../types/finance";
import { useCurrency } from "../../context/CurrencyContext";
import { parseAmountInput, toStoredAmount } from "../../context/currencyAmounts";
import { classifyTransactionCategory } from "./categoryClassifier";

export const NEW_TRANSACTION_FORM_ID = "new-transaction-form";

export type NewTransactionFormProps = {
  wallets: Wallet[];
  onSubmit(transaction: Omit<Transaction, "id">): void;
};

const categories = ["Food", "Drinks", "Groceries", "Shopping", "Fuel", "Housing", "Entertainment", "Salary", "Bank", "Investment", "Others"];
const fieldClassName = "min-w-0 w-full rounded-xl border border-[var(--paper-border)] bg-[var(--paper-canvas)] px-3 py-2.5 text-base text-[var(--paper-ink)] outline-none focus:border-[var(--paper-ink)]";
const labelClassName = "flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[var(--paper-muted)]";

export function NewTransactionForm({ wallets, onSubmit }: NewTransactionFormProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { formatCurrency, currency } = useCurrency();
  const isVietnamese = i18n.language?.startsWith("vi");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "outcome">("outcome");
  const [category, setCategory] = useState("Others");
  const [walletId, setWalletId] = useState(wallets[0]?.id || 1);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [hasManuallySelected, setHasManuallySelected] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (name.trim().length < 2 || hasManuallySelected) return;
    setCategory(classifyTransactionCategory(name));
  }, [name, hasManuallySelected]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !amount) return;
    const numericAmount = parseAmountInput(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    onSubmit({
      name,
      amount: toStoredAmount(type === "outcome" ? -numericAmount : numericAmount, currency),
      category,
      // Preserve the native ISO date value expected by the transaction RPC.
      date,
      walletId,
      note: note.trim() || null,
    });
  };

  return (
    <form id={NEW_TRANSACTION_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm text-[var(--paper-ink)]">
      <div className="flex gap-2 rounded-xl border border-[var(--paper-border)] bg-[var(--paper-canvas)] p-1">
        <button
          type="button"
          aria-pressed={type === "outcome"}
          onClick={() => setType("outcome")}
          className="flex-1 cursor-pointer rounded-lg py-2 text-center text-sm font-semibold transition-all"
          style={{ background: type === "outcome" ? "var(--paper-ink)" : "transparent", color: type === "outcome" ? "white" : "var(--paper-muted)" }}
        >
          {t("stats.outcome")}
        </button>
        <button
          type="button"
          aria-pressed={type === "income"}
          onClick={() => setType("income")}
          className="flex-1 cursor-pointer rounded-lg py-2 text-center text-sm font-semibold transition-all"
          style={{ background: type === "income" ? "var(--paper-sage-soft)" : "transparent", color: type === "income" ? "var(--paper-ink)" : "var(--paper-muted)" }}
        >
          {t("stats.income")}
        </button>
      </div>

      <label className={labelClassName}>
        {t("dashboard.description")}
        <input
          type="text"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (event.target.value.trim() === "") setHasManuallySelected(false);
          }}
          className={fieldClassName}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClassName}>
          {t("dashboard.amount")}
          <input type="number" inputMode="decimal" step="0.01" min="0.01" required placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          {t("dashboard.category")}
          <select
            value={category}
            onChange={(event) => {
              setHasManuallySelected(true);
              setCategory(event.target.value);
            }}
            className={fieldClassName}
          >
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div data-testid="transaction-date-wallet-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClassName}>
          {isVietnamese ? "Ngày giao dịch" : "Transaction date"}
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          {isVietnamese ? "Ví" : "Wallet"}
          <select value={walletId} onChange={(event) => setWalletId(Number(event.target.value))} className={fieldClassName}>
            {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label} ({formatCurrency(wallet.balance)})</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={noteExpanded}
          aria-controls="new-transaction-note"
          onClick={() => setNoteExpanded((expanded) => !expanded)}
          className="self-start cursor-pointer py-2 text-sm font-semibold text-[var(--paper-muted)]"
        >
          {noteExpanded ? (isVietnamese ? "Ẩn ghi chú" : "Hide note") : (isVietnamese ? "Thêm ghi chú" : "Add note")}
        </button>
        {noteExpanded ? (
          <label className={labelClassName}>
            {isVietnamese ? "Ghi chú" : "Note"}
            <textarea id="new-transaction-note" maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} className={`${fieldClassName} resize-none`} />
          </label>
        ) : null}
      </div>
    </form>
  );
}

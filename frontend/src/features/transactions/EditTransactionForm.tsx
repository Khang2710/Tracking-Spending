import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { parseAmountInput, toDisplayedAmount, toStoredAmount } from "../../context/currencyAmounts";
import { C } from "../../design/tokens";
import type { Transaction, Wallet } from "../../types/finance";

export function EditTransactionForm({
  transaction,
  wallets,
  onSave,
  onDelete,
}: {
  transaction: Transaction;
  wallets: Wallet[];
  onSave: (updatedTx: Transaction) => void;
  onDelete?: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { formatCurrency, currency } = useCurrency();

  const [name, setName] = useState(transaction.name);
  const [amount, setAmount] = useState(String(toDisplayedAmount(Math.abs(transaction.amount), currency)));
  const [type, setType] = useState<"income" | "outcome">(
    transaction.amount < 0 ? "outcome" : "income"
  );
  const [category, setCategory] = useState(transaction.category || "Others");
  const [walletId, setWalletId] = useState(transaction.walletId || wallets[0]?.id || 1);

  // Convert DD-MM-YYYY or ISO format to YYYY-MM-DD for <input type="date" />
  const [date, setDate] = useState(() => {
    if (!transaction.date) return new Date().toISOString().split("T")[0];
    const cleanDate = transaction.date.split("T")[0].trim();
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return new Date().toISOString().split("T")[0];
  });

  const categories = [
    "Food",
    "Drinks",
    "Groceries",
    "Shopping",
    "Fuel",
    "Housing",
    "Entertainment",
    "Salary",
    "Bank",
    "Investment",
    "Others",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    const numAmt = parseAmountInput(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    const finalAmount = toStoredAmount(type === "outcome" ? -numAmt : numAmt, currency);
    onSave({
      ...transaction,
      name,
      amount: finalAmount,
      category,
      date,
      walletId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-[var(--paper-ink)]">
      <div className="flex gap-2 p-1 rounded-xl bg-surf">
        <button
          type="button"
          onClick={() => setType("outcome")}
          className="flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer text-xs md:text-sm"
          style={{
            background: type === "outcome" ? C.red : "transparent",
            color: type === "outcome" ? C.white : C.tm,
          }}
        >
          {t("stats.outcome")}
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className="flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer text-xs md:text-sm"
          style={{
            background: type === "income" ? C.green : "transparent",
            color: type === "income" ? C.bg : C.tm,
          }}
        >
          {t("stats.income")}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.description")}
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-[var(--paper-ink)] bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
            {t("dashboard.amount")}
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-[var(--paper-ink)] bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
            {t("dashboard.category")}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-[var(--paper-ink)] bg-surf"
          style={{ borderColor: C.border }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-sec">
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.payWith")}
        </label>
        <select
          value={walletId}
          onChange={(e) => setWalletId(Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-[var(--paper-ink)] bg-surf"
          style={{ borderColor: C.border }}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id} className="bg-sec">
              {w.label} ({formatCurrency(w.balance)})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.date")}
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-[var(--paper-ink)] bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex items-center gap-3 mt-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(transaction.id)}
            className="flex-1 py-3 rounded-xl font-bold transition-all cursor-pointer bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          >
            {t("common.delete")}
          </button>
        )}
        <button
          type="submit"
          className="flex-[2] py-3 rounded-xl font-bold transition-all cursor-pointer"
          style={{ background: C.gold, color: C.bg }}
        >
          {t("dashboard.saveTransaction")}
        </button>
      </div>
    </form>
  );
}



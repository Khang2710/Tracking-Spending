import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { toDisplayedAmount, toStoredAmount } from "../../context/currencyAmounts";
import { C } from "../../design/tokens";

export function EditProfileForm({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (newName: string) => void;
}) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSave(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white font-sans">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">Username</label>
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter username..."
          className="w-full px-4 py-3 rounded-xl outline-none border text-white bg-surf font-semibold transition-all focus:border-gold"
          style={{ borderColor: C.border }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer text-sm"
        style={{ background: C.gold, color: C.bg }}
      >
        Update Name
      </button>
    </form>
  );
}

export function EditBudgetForm({
  initialBudget,
  onSave,
}: {
  initialBudget: number;
  onSave: (newBudget: number) => void;
}) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [budgetVal, setBudgetVal] = useState(initialBudget === 0 ? "" : toDisplayedAmount(initialBudget, currency).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = budgetVal.trim() === "" ? 0 : parseFloat(budgetVal);
    if (!isNaN(val) && val >= 0) {
      onSave(toStoredAmount(val, currency));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white font-sans">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">{t("dashboard.monthlyBudget")} ({currency})</label>
        <input
          type="number"
          step="1"
          autoFocus
          value={budgetVal}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setBudgetVal(e.target.value)}
          placeholder="0"
          className="w-full px-4 py-3 rounded-xl outline-none border text-white bg-surf font-semibold transition-all focus:border-gold"
          style={{ borderColor: C.border }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer text-sm"
        style={{ background: C.gold, color: C.bg }}
      >
        Save Budget
      </button>
    </form>
  );
}




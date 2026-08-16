import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  C,
  Modal,
  ProgressBar,
  parseDateInfo,
  categoryColors,
  categoryIcons,
} from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import type { Transaction } from "../../App";
import { TRANSACTION_CATEGORIES } from "../Transaction/TransactionForm";

interface BudgetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  budget: number;
  categoryBudgets: Record<string, number>;
  transactions: Transaction[];
  onSave: (totalBudget: number, categoryBudgets: Record<string, number>) => void;
}

export default function BudgetManager({
  isOpen,
  onClose,
  budget,
  categoryBudgets,
  transactions,
  onSave,
}: BudgetManagerProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const [totalVal, setTotalVal] = useState(budget === 0 ? "" : budget.toString());
  const [catVals, setCatVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TRANSACTION_CATEGORIES.map((c) => [
        c,
        (categoryBudgets[c] ?? 0) === 0 ? "" : (categoryBudgets[c] ?? 0).toString(),
      ])
    )
  );

  useEffect(() => {
    if (isOpen) {
      setTotalVal(budget === 0 ? "" : budget.toString());
      setCatVals(
        Object.fromEntries(
          TRANSACTION_CATEGORIES.map((c) => [
            c,
            (categoryBudgets[c] ?? 0) === 0 ? "" : (categoryBudgets[c] ?? 0).toString(),
          ])
        )
      );
    }
  }, [isOpen, budget, categoryBudgets]);

  const now = new Date();
  const monthIndex = now.getMonth();
  const year = now.getFullYear();

  const monthSpending: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.amount >= 0) continue;
    const { month, year: txYear } = parseDateInfo(tx.date);
    if (month === monthIndex && txYear === year) {
      monthSpending[tx.category] = (monthSpending[tx.category] ?? 0) + Math.abs(tx.amount);
    }
  }

  const parseAmount = (v: string) => {
    const trimmed = v.trim();
    if (trimmed === "") return 0;
    const n = parseFloat(trimmed);
    return isNaN(n) || n < 0 ? 0 : n;
  };

  const colorFor = (spent: number, limit: number) => {
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (pct >= 100) return "#EF4444";
    if (pct >= 80) return "#F97316";
    return C.gold;
  };

  const handleSave = () => {
    const totalBudget = parseAmount(totalVal);
    const newCats: Record<string, number> = {};
    for (const cat of TRANSACTION_CATEGORIES) {
      const v = parseAmount(catVals[cat] ?? "");
      if (v > 0) newCats[cat] = v;
    }
    onSave(totalBudget, newCats);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("dashboard.monthlyBudget", "Monthly Budget")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-4 text-sm text-white font-sans"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">
            {t("dashboard.monthlyBudget")}
          </label>
          <input
            type="number"
            step="1"
            autoFocus
            value={totalVal}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setTotalVal(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl outline-none border text-white bg-surf font-semibold transition-all focus:border-gold"
            style={{ borderColor: C.border }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">
            {t("budget.byCategory", "Per-Category Budget")}
          </span>
          <div className="flex flex-col max-h-[45vh] overflow-y-auto pr-1 gap-1">
            {TRANSACTION_CATEGORIES.map((cat) => {
              const spent = monthSpending[cat] ?? 0;
              const limit = parseAmount(catVals[cat] ?? "");
              const Icon = categoryIcons[cat];
              return (
                <div
                  key={cat}
                  className="p-2.5 rounded-xl border"
                  style={{ borderColor: C.border, background: C.surf }}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={15} style={{ color: categoryColors[cat] }} />}
                    <span className="font-semibold text-[13px] flex-1">{cat}</span>
                    <span className="text-[12px] text-tm">
                      {formatCurrency(spent)}
                      {limit > 0 ? ` / ${formatCurrency(limit)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ProgressBar
                      value={spent}
                      max={limit}
                      color={colorFor(spent, limit)}
                      delay={0.1}
                    />
                    <input
                      type="number"
                      step="1"
                      value={catVals[cat] ?? ""}
                      onChange={(e) =>
                        setCatVals((prev) => ({ ...prev, [cat]: e.target.value }))
                      }
                      placeholder="0"
                      className="w-[110px] px-2.5 py-1 rounded-lg outline-none border text-white bg-bg text-[13px] font-semibold transition-all focus:border-gold"
                      style={{ borderColor: C.border }}
                    />
                  </div>
                  {limit > 0 && spent > limit && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: "#EF4444" }}>
                      {t("budget.overBudget", "Over budget")}: {formatCurrency(spent - limit)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer text-sm"
          style={{ background: C.gold, color: C.bg }}
        >
          {t("common.save", "Save")}
        </button>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  onSave: (totalBudget: number, categoryBudgets: Record<string, number>) => Promise<void>;
  isLoading?: boolean;
}

export default function BudgetManager({
  isOpen,
  onClose,
  budget,
  categoryBudgets,
  transactions,
  onSave,
  isLoading = false,
}: BudgetManagerProps) {
  const { t } = useTranslation();
  const { currency, exchangeRate, formatCurrency } = useCurrency();

  const [isSaving, setIsSaving] = useState(false);

  const toFormDisplay = (vndVal: number) => {
    if (!vndVal || vndVal === 0) return "";
    const displayVal = currency === "USD" ? vndVal / exchangeRate : vndVal;
    return Number(displayVal.toFixed(2)).toString();
  };

  const toVndSubmit = (inputVal: number) => {
    if (!inputVal || inputVal <= 0) return 0;
    return currency === "USD" ? Math.round(inputVal * exchangeRate) : Math.round(inputVal);
  };

  const [totalVal, setTotalVal] = useState(() => toFormDisplay(budget));
  const [catVals, setCatVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TRANSACTION_CATEGORIES.map((c) => [
        c,
        toFormDisplay(categoryBudgets[c] ?? 0),
      ])
    )
  );

  useEffect(() => {
    if (isOpen) {
      setTotalVal(toFormDisplay(budget));
      setCatVals(
        Object.fromEntries(
          TRANSACTION_CATEGORIES.map((c) => [
            c,
            toFormDisplay(categoryBudgets[c] ?? 0),
          ])
        )
      );
    }
  }, [isOpen, budget, categoryBudgets, currency]);

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

  const MAX_ALLOWED_BUDGET = 1_000_000_000_000;

  const parseAmount = (v: string) => {
    const trimmed = v.trim();
    if (trimmed === "") return 0;
    const n = parseFloat(trimmed);
    if (isNaN(n) || n < 0) return 0;
    return Math.min(n, MAX_ALLOWED_BUDGET);
  };

  const colorFor = (spent: number, limit: number) => {
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (pct >= 100) return "#EF4444";
    if (pct >= 80) return "#F97316";
    return C.gold;
  };

  const handleSave = async () => {
    const rawTotal = parseAmount(totalVal);
    const totalBudget = toVndSubmit(rawTotal);

    const newCats: Record<string, number> = {};
    for (const cat of TRANSACTION_CATEGORIES) {
      const rawCatVal = parseAmount(catVals[cat] ?? "");
      const catVnd = toVndSubmit(rawCatVal);
      if (catVnd > 0) newCats[cat] = catVnd;
    }

    try {
      setIsSaving(true);
      await onSave(totalBudget, newCats);
      toast.success(t("budget.saveSuccess", "Đã lưu cấu hình ngân sách thành công!"));
      onClose();
    } catch (e: any) {
      console.error("[BudgetManager] Failed to save budget:", e);
      const errMsg = e?.message || t("budget.saveError", "Lưu ngân sách thất bại, vui lòng thử lại!");
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
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
            disabled={isSaving || isLoading}
            autoFocus
            value={totalVal}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setTotalVal(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl outline-none border text-white bg-surf font-semibold transition-all focus:border-gold disabled:opacity-50"
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
              const rawLimit = parseAmount(catVals[cat] ?? "");
              const limitVnd = toVndSubmit(rawLimit);
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
                      {limitVnd > 0 ? ` / ${formatCurrency(limitVnd)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ProgressBar
                      value={spent}
                      max={limitVnd}
                      color={colorFor(spent, limitVnd)}
                      delay={0.1}
                    />
                    <input
                      type="number"
                      step="1"
                      disabled={isSaving || isLoading}
                      value={catVals[cat] ?? ""}
                      onChange={(e) =>
                        setCatVals((prev) => ({ ...prev, [cat]: e.target.value }))
                      }
                      placeholder="0"
                      className="w-[110px] px-2.5 py-1 rounded-lg outline-none border text-white bg-bg text-[13px] font-semibold transition-all focus:border-gold disabled:opacity-50"
                      style={{ borderColor: C.border }}
                    />
                  </div>
                  {limitVnd > 0 && spent > limitVnd && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: "#EF4444" }}>
                      {t("budget.overBudget", "Over budget")}: {formatCurrency(spent - limitVnd)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || isLoading}
          className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: C.gold, color: C.bg }}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>{t("common.saving", "Đang lưu...")}</span>
            </>
          ) : (
            <span>{t("common.save", "Save")}</span>
          )}
        </button>
      </form>
    </Modal>
  );
}


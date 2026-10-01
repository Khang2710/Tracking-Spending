import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  X,
  Trash2,
  Edit2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { Transaction, Wallet, categoryIcons } from "../../App";

interface CashFlowCalendarProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => void;
  onEditTransaction?: (tx: Transaction) => void;
  wallets?: Wallet[];
}

type FilterMode = "all" | "income" | "expense";

// Helper to extract day, month index (0-11), and year from DD-MM-YYYY or ISO date strings
const parseDateFull = (dateStr: string): { day: number; month: number; year: number } => {
  const now = new Date();
  const defaultRes = { day: now.getDate(), month: now.getMonth(), year: now.getFullYear() };
  if (!dateStr) return defaultRes;

  const trimmed = dateStr.trim();
  if (trimmed.startsWith("Today") || trimmed.startsWith("Hôm nay")) {
    return defaultRes;
  }

  // Handle DD-MM-YYYY or YYYY-MM-DD or DD/MM/YYYY or YYYY/MM/DD
  const separator = trimmed.includes("-") ? "-" : trimmed.includes("/") ? "/" : null;
  if (separator) {
    const parts = trimmed.split(separator).map((p) => parseInt(p, 10));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        return {
          year: parts[0],
          month: Math.max(0, Math.min(11, parts[1] - 1)),
          day: parts[2],
        };
      } else if (parts[2] > 1000) {
        // DD-MM-YYYY (e.g. 10-08-2026 => 10 is Day, 08 is Month, 2026 is Year)
        return {
          day: parts[0],
          month: Math.max(0, Math.min(11, parts[1] - 1)),
          year: parts[2],
        };
      }
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
  }

  return defaultRes;
};

export default function CashFlowCalendar({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  wallets,
}: CashFlowCalendarProps) {
  const { t, i18n } = useTranslation();
  const { formatCurrency, currency, exchangeRate } = useCurrency();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format month name
  const monthLabel = currentDate.toLocaleDateString(
    i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 1 + index).toLocaleDateString(i18n.language?.startsWith("vi") ? "vi-VN" : "en-US", { weekday: "short" }));

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Filter transactions for selected month
  const monthTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const info = parseDateFull(tx.date);
      return info.year === year && info.month === month;
    });
  }, [transactions, year, month]);

  // Calculate total income and expense
  const totalIncome = useMemo(
    () => monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const totalExpense = useMemo(
    () => monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    [monthTxs]
  );
  const netCashFlow = totalIncome - totalExpense;

  // Generate calendar days grid (Monday to Sunday start)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

  // Group transactions by day number
  const dailyData = useMemo(() => {
    const map: Record<number, { income: number; expense: number; txs: Transaction[] }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      map[i] = { income: 0, expense: 0, txs: [] };
    }
    monthTxs.forEach((tx) => {
      const dayNum = parseDateFull(tx.date).day;
      if (map[dayNum]) {
        map[dayNum].txs.push(tx);
        if (tx.amount > 0) map[dayNum].income += tx.amount;
        else map[dayNum].expense += Math.abs(tx.amount);
      }
    });
    return map;
  }, [monthTxs, daysInMonth]);

  const selectedDayTxs = selectedDay ? dailyData[selectedDay]?.txs || [] : [];

  // Helper for compact day amount string (e.g. 200k, 1.5M, 2B, or $200, $1.5k)
  const formatCompact = (val: number) => {
    if (val === 0) return "";
    const num = currency === "USD" ? val / exchangeRate : val;
    const abs = Math.abs(num);

    if (currency === "USD") {
      if (abs >= 1_000_000) {
        const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "");
        return `$${formatted}M`;
      }
      if (abs >= 1_000) {
        const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
        return `$${formatted}k`;
      }
      return `$${Math.round(abs)}`;
    } else {
      if (abs >= 1_000_000_000) {
        const formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
        return `${formatted}B`;
      }
      if (abs >= 1_000_000) {
        const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, "");
        return `${formatted}M`;
      }
      if (abs >= 1_000) {
        const formatted = (abs / 1_000).toFixed(0);
        return `${formatted}k`;
      }
      return `${Math.round(abs)}`;
    }
  };

  return (
    <div className="flex flex-col gap-5 font-sans text-[var(--paper-ink)]">
      {/* Month Selector & Summary Cards */}
      <div className="rounded-[26px] border border-[var(--paper-border)] bg-white p-4 shadow-[0_18px_48px_rgba(42,45,39,0.055)] md:p-6">
        {/* Month Selector Bar */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--paper-muted)]">
            {t("dashboard.monthlyBudget", "Ngân sách tháng")}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-[var(--paper-border)] bg-[var(--paper-surface)] px-3 py-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="cursor-pointer p-1 text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 text-xs font-extrabold capitalize">{monthLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="cursor-pointer p-1 text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Net Balance Banner */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--paper-muted)]">{t("stats.netCashFlow", "Dòng tiền ròng")}</span>
          <span
            className={`text-2xl md:text-3xl font-bold font-mono ${
              netCashFlow >= 0 ? "text-[var(--paper-income)]" : "text-[var(--paper-expense)]"
            }`}
          >
            {netCashFlow >= 0 ? "(+) " : "(-) "}
            {formatCurrency(Math.abs(netCashFlow))}
          </span>
        </div>

        {/* Inflow vs Outflow Grid */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="flex items-center gap-3 rounded-[17px] border border-[var(--paper-border)] bg-[var(--paper-surface)] p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8eee4] text-[var(--paper-income)]">
              <ArrowDownLeft size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[var(--paper-muted)]">{t("stats.moneyIn", "Tiền vào")}</span>
              <span className="font-mono text-sm font-bold text-[var(--paper-income)]">
                {formatCurrency(totalIncome)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[17px] border border-[var(--paper-border)] bg-[var(--paper-surface)] p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0eb] text-[var(--paper-expense)]">
              <ArrowUpRight size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[var(--paper-muted)]">{t("stats.moneyOut", "Tiền ra")}</span>
              <span className="font-mono text-sm font-bold text-[var(--paper-expense)]">
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Mode Tabs & Calendar Title */}
      <div className="rounded-[26px] border border-[var(--paper-border)] bg-white p-4 shadow-[0_18px_48px_rgba(42,45,39,0.055)] md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarIcon size={18} color="#4F7D62" /> {t("stats.detailedCalendar", "Lịch Chi Tiết")}
          </h3>

          <div className="flex items-center gap-1 rounded-xl border border-[var(--paper-border)] bg-[var(--paper-surface)] p-1">
            {(["income", "expense", "all"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === mode
                    ? "bg-[var(--paper-ink)] text-white"
                    : "text-[var(--paper-muted)] hover:text-[var(--paper-ink)]"
                }`}
              >
                {mode === "income"
                  ? t("stats.moneyIn", "Tiền vào")
                  : mode === "expense"
                  ? t("stats.moneyOut", "Tiền ra")
                  : t("stats.netCashFlow", "Dòng tiền")}
              </button>
            ))}
          </div>
        </div>

        {/* Days Header */}
        <div className="mt-3 grid grid-cols-7 border-b border-[var(--paper-border)] pb-3 text-center text-xs font-bold text-[var(--paper-muted)]">
          {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {/* Padding days before start of month */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`pad-${idx}`} className="h-14 rounded-xl bg-[var(--paper-surface)] opacity-60 md:h-16" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const data = dailyData[dayNum];
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            let displayVal = "";
            let textColor = "text-[var(--paper-muted)]";
            if (filterMode === "income" && data.income > 0) {
              displayVal = `+${formatCompact(data.income)}`;
              textColor = "text-[var(--paper-income)]";
            } else if (filterMode === "expense" && data.expense > 0) {
              displayVal = `-${formatCompact(data.expense)}`;
              textColor = "text-[var(--paper-expense)]";
            } else if (filterMode === "all") {
              const net = data.income - data.expense;
              if (net !== 0) {
                displayVal = net > 0 ? `+${formatCompact(net)}` : `-${formatCompact(Math.abs(net))}`;
                textColor = net > 0 ? "text-[var(--paper-income)]" : "text-[var(--paper-expense)]";
              }
            }

            const fullAmountStr =
              filterMode === "income" && data.income > 0
                ? `+${formatCurrency(data.income)}`
                : filterMode === "expense" && data.expense > 0
                ? `-${formatCurrency(data.expense)}`
                : filterMode === "all" && data.income - data.expense !== 0
                ? `${data.income - data.expense > 0 ? "+" : "-"}${formatCurrency(Math.abs(data.income - data.expense))}`
                : "";

            return (
              <motion.div
                key={dayNum}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-13 md:h-16 rounded-xl p-1 md:p-2 flex flex-col justify-between cursor-pointer border transition-all overflow-hidden ${
                  isToday
                    ? "border-[#a66f2c] bg-[#f4ece0]"
                    : selectedDay === dayNum
                    ? "border-[var(--paper-ink)] bg-[var(--paper-surface)]"
                    : "border-[var(--paper-border)] bg-[var(--paper-surface)] hover:bg-[var(--paper-sage-soft)]"
                }`}
                title={fullAmountStr ? `${dayNum}: ${fullAmountStr}` : undefined}
              >
                <span className="text-[11px] font-bold leading-tight text-[var(--paper-ink)]">{dayNum}</span>
                <span className={`text-[9px] sm:text-[11px] font-bold font-mono leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${textColor}`}>
                  {displayVal}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Day Transaction Detail Modal */}
      <AnimatePresence>
        {selectedDay !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-[var(--paper-border)] bg-white p-5 text-[var(--paper-ink)] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-3">
                <h4 className="font-bold text-base">
                  {t("stats.transactionsOnDate", { date: `${selectedDay}/${month + 1}/${year}` })}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="p-1 hover:text-[#C9A45B] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto hide-scroll">
                {selectedDayTxs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--paper-muted)]">
                      {t("stats.noTransactionsOnDay")}
                  </p>
                ) : (
                  selectedDayTxs.map((tx) => {
                    const IconComp = categoryIcons[tx.category] || CalendarIcon;
                    const isIncome = tx.amount > 0;
                    const walletObj = wallets?.find((w) => w.id === tx.walletId);
                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          if (onEditTransaction) {
                            setSelectedDay(null);
                            onEditTransaction(tx);
                          }
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--paper-border)] bg-[var(--paper-surface)] p-3 transition-colors hover:bg-[var(--paper-sage-soft)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--paper-sage-soft)] text-[var(--paper-ink)]">
                            <IconComp size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--paper-ink)]">{tx.name}</span>
                            <span className="text-[10px] text-[var(--paper-muted)]">
                              {tx.category} {walletObj ? `• ${walletObj.label}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isIncome ? "text-[var(--paper-income)]" : "text-[var(--paper-expense)]"
                            }`}
                          >
                            {isIncome ? "+" : ""}
                            {formatCurrency(tx.amount)}
                          </span>
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(null);
                                onEditTransaction(tx);
                              }}
                              className="cursor-pointer p-1 text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
                              title="Sửa giao dịch"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTransaction(tx.id);
                            }}
                            className="cursor-pointer p-1 text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-expense)]"
                            title="Xóa giao dịch"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

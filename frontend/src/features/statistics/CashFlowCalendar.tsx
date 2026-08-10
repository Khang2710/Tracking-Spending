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
import { C, Transaction, Wallet, categoryIcons } from "../../App";

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

  // Helper for compact day amount string
  const formatCompact = (val: number) => {
    if (val === 0) return "";
    if (currency === "USD") {
      const usdVal = val / exchangeRate;
      const abs = Math.abs(usdVal);
      return `$${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    } else {
      const abs = Math.abs(val);
      return `${abs.toLocaleString("vi-VN")}`;
    }
  };

  return (
    <div className="flex flex-col gap-5 text-white font-sans">
      {/* Month Selector & Summary Cards */}
      <div className="bg-[#17171A] p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
        {/* Month Selector Bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
            {t("dashboard.monthlyBudget", "Ngân sách tháng")}
          </span>
          <div className="flex items-center gap-2 bg-[#242428] px-3 py-1.5 rounded-full border border-white/10">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:text-[#C9A45B] cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold capitalize px-1">{monthLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:text-[#C9A45B] cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Net Balance Banner */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[#8A8A8A] font-medium">{t("stats.netCashFlow", "Dòng tiền ròng")}</span>
          <span
            className={`text-2xl md:text-3xl font-bold font-mono ${
              netCashFlow >= 0 ? "text-[#3DDC84]" : "text-[#FF6B6B]"
            }`}
          >
            {netCashFlow >= 0 ? "(+) " : "(-) "}
            {formatCurrency(Math.abs(netCashFlow))}
          </span>
        </div>

        {/* Inflow vs Outflow Grid */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-[#1E1E21] p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3DDC84]/15 flex items-center justify-center text-[#3DDC84]">
              <ArrowDownLeft size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#8A8A8A]">{t("stats.moneyIn", "Tiền vào")}</span>
              <span className="text-sm font-bold text-[#3DDC84] font-mono">
                {formatCurrency(totalIncome)}
              </span>
            </div>
          </div>

          <div className="bg-[#1E1E21] p-3.5 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B6B]/15 flex items-center justify-center text-[#FF6B6B]">
              <ArrowUpRight size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#8A8A8A]">{t("stats.moneyOut", "Tiền ra")}</span>
              <span className="text-sm font-bold text-[#FF6B6B] font-mono">
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Mode Tabs & Calendar Title */}
      <div className="bg-[#17171A] p-4 md:p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarIcon size={18} color={C.gold} /> {t("stats.detailedCalendar", "Lịch Chi Tiết")}
          </h3>

          <div className="flex items-center gap-1 bg-[#0F0F10] p-1 rounded-xl border border-white/10">
            {(["income", "expense", "all"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === mode
                    ? "bg-[#C9A45B] text-[#0F0F10]"
                    : "text-[#8A8A8A] hover:text-white"
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
        <div className="grid grid-cols-7 text-center text-xs font-bold text-[#8A8A8A] border-b border-white/10 pb-2">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span>CN</span>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {/* Padding days before start of month */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`pad-${idx}`} className="h-14 md:h-16 rounded-xl bg-[#0F0F10]/30 opacity-20" />
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
            let textColor = "text-[#8A8A8A]";
            if (filterMode === "income" && data.income > 0) {
              displayVal = `+${formatCompact(data.income)}`;
              textColor = "text-[#3DDC84]";
            } else if (filterMode === "expense" && data.expense > 0) {
              displayVal = `-${formatCompact(data.expense)}`;
              textColor = "text-[#FF6B6B]";
            } else if (filterMode === "all") {
              const net = data.income - data.expense;
              if (net !== 0) {
                displayVal = net > 0 ? `+${formatCompact(net)}` : `-${formatCompact(Math.abs(net))}`;
                textColor = net > 0 ? "text-[#3DDC84]" : "text-[#FF6B6B]";
              }
            }

            return (
              <motion.div
                key={dayNum}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-14 md:h-16 rounded-xl p-1.5 md:p-2 flex flex-col justify-between cursor-pointer border transition-all ${
                  isToday
                    ? "border-[#C9A45B] bg-[#C9A45B]/10"
                    : selectedDay === dayNum
                    ? "border-white/30 bg-[#242428]"
                    : "border-white/5 bg-[#1E1E21] hover:bg-[#242428]"
                }`}
              >
                <span className="text-[11px] font-bold text-white">{dayNum}</span>
                <span className={`text-[10px] md:text-[11px] font-bold font-mono truncate ${textColor}`}>
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
              className="w-full max-w-md bg-[#1E1E21] rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="font-bold text-base">
                  Giao dịch ngày {selectedDay}/{month + 1}/{year}
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
                  <p className="text-xs text-[#8A8A8A] text-center py-6">
                    Không có giao dịch nào trong ngày này.
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
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#17171A] border border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[#C9A45B]">
                            <IconComp size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{tx.name}</span>
                            <span className="text-[10px] text-[#8A8A8A]">
                              {tx.category} {walletObj ? `• ${walletObj.label}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isIncome ? "text-[#3DDC84]" : "text-[#FF6B6B]"
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
                              className="text-[#8A8A8A] hover:text-[#C9A45B] p-1 cursor-pointer transition-colors"
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
                            className="text-[#8A8A8A] hover:text-[#FF6B6B] p-1 cursor-pointer transition-colors"
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

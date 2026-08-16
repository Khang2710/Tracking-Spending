import { motion } from "motion/react";
import {
  Plus,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  C,
  Card,
  ProgressBar,
  SectionHeader,
  categoryIcons,
  categoryColors,
  parseDateInfo,
} from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import type { Wallet, Transaction } from "../../App";

interface DashboardProps {
  wallets: Wallet[];
  transactions: Transaction[];
  budget: number;
  onEditBudgetClick: () => void;
  onAddTransactionClick: () => void;
  onAddWalletClick: () => void;
  userName: string;
  onEditName: () => void;
  onEditWalletClick: (wallet: Wallet) => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export default function Dashboard({
  wallets,
  transactions,
  budget,
  onEditBudgetClick,
  onAddTransactionClick,
  onAddWalletClick,
  userName,
  onEditName,
  onEditWalletClick,
  onDeleteTransaction,
  onEditTransaction,
}: DashboardProps) {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Compute current month name, days in month, days remaining, and outcome dynamically
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();

  const isVi = i18n.language?.startsWith("vi");
  const monthNamesVi = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  const monthNamesEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = isVi ? monthNamesVi[currentMonthIndex] : monthNamesEn[currentMonthIndex];

  const currentMonthDays = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysLeft = currentMonthDays - currentDay;

  const currentMonthTransactions = transactions.filter((t) => {
    const { month: txMonth, year: txYear } = parseDateInfo(t.date);
    return txMonth === currentMonthIndex && txYear === currentYear;
  });

  const totalCurrentOutcome = currentMonthTransactions.reduce(
    (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
    0
  );
  
  const rawBudgetPct = budget > 0 ? (totalCurrentOutcome / budget) * 100 : 0;
  const pctSpent = Math.min(Math.round(rawBudgetPct), 100);
  const overAmount = Math.max(0, totalCurrentOutcome - budget);

  let progressColor: string = C.gold;
  if (rawBudgetPct >= 100) {
    progressColor = "#EF4444";
  } else if (rawBudgetPct >= 80) {
    progressColor = "#F97316";
  }

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <div className="flex flex-col">
      {/* Mobile Header (Hidden on Desktop) */}
      <div
        className="px-5 pt-12 pb-6 md:hidden"
        style={{
          background: `linear-gradient(180deg, #1C1508 0%, #141008 55%, ${C.bg} 100%)`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <motion.div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
                color: C.bg,
                boxShadow: `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.gold}55`,
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEditName}
            >
              {initials}
            </motion.div>
            <div>
              <p
                className="text-[12px] font-medium mb-0.5"
                style={{ color: C.tm }}
              >
                {t("dashboard.totalBalance")}
              </p>
              <div className="flex items-baseline gap-0.5">
                <span
                  className="text-[24px] md:text-[28px] font-bold tracking-tight leading-none"
                  style={{ color: C.white }}
                >
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowDownRight size={12} color={C.red} strokeWidth={2.5} />
                <span className="text-[12px]" style={{ color: C.tm }}>
                  {formatCurrency(totalCurrentOutcome)} · {currentMonthName} {currentYear}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: C.gold }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={onAddTransactionClick}
          >
            <Plus size={20} color={C.bg} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      <div className="px-5 md:px-0 flex flex-col md:grid md:grid-cols-12 gap-5 md:gap-8 pb-6">
        {/* Left Column: Budget & Wallets */}
        <div className="flex flex-col gap-5 md:gap-8 md:col-span-8">
          {/* Budget Card */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }} className="cursor-pointer">
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[15px] md:text-[17px] font-semibold"
                  style={{ color: C.white }}
                >
                  {currentMonthName} - {t("dashboard.monthlyBudget")}
                </span>
                <span
                  className="text-[13px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-gold/20 transition-colors"
                  style={{ background: C.gold + "22", color: C.gold }}
                  onClick={onEditBudgetClick}
                >
                  {pctSpent}% ({t("common.edit")})
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span
                  className="text-[22px] md:text-[28px] font-bold"
                  style={{ color: C.gold }}
                >
                  {formatCurrency(totalCurrentOutcome)}
                </span>
                <span className="text-[14px] md:text-[16px]" style={{ color: C.tm }}>
                  / {formatCurrency(budget)}
                </span>
              </div>
              <ProgressBar value={totalCurrentOutcome} max={budget} color={progressColor} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[12px] md:text-[14px]" style={{ color: C.tm }}>
                  {t("dashboard.dailyAvg")}: {formatCurrency(totalCurrentOutcome / currentMonthDays)} – {t("dashboard.limit")}: {formatCurrency(budget / currentMonthDays)}
                </span>
                <span
                  className="text-[12px] md:text-[14px] font-semibold"
                  style={{ color: C.t2 }}
                >
                  {daysLeft === 0 ? t("dashboard.lastDayOfMonth") : `${daysLeft} ${t("dashboard.daysLeft")}`}
                </span>
              </div>

              {/* Alert Banner */}
              {rawBudgetPct >= 100 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="alert-banner mt-3.5 p-3 md:p-3.5 rounded-xl border flex items-center gap-2.5 font-sans"
                  style={{
                    background: "#EF44441A",
                    borderColor: "#EF444440",
                    color: "#F87171",
                  }}
                >
                  <span className="text-xs md:text-sm font-bold leading-relaxed">
                    {t("dashboard.budgetAlertDanger", {
                      amount: formatCurrency(overAmount),
                    })}
                  </span>
                </motion.div>
              ) : rawBudgetPct >= 80 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="alert-banner mt-3.5 p-3 md:p-3.5 rounded-xl border flex items-center gap-2.5 font-sans text-xs md:text-sm font-medium"
                  style={{
                    background: "#F973161A",
                    borderColor: "#F9731640",
                    color: "#FB923C",
                  }}
                >
                  <span className="leading-relaxed">
                    {t("dashboard.budgetAlertWarning", {
                      percent: Math.round(rawBudgetPct),
                    })}
                  </span>
                </motion.div>
              ) : null}
            </Card>
          </motion.div>

          {/* Wallets */}
          <div>
            <SectionHeader title={t("dashboard.activeWallets")} actionLabel={`+ ${t("common.add")}`} onAction={onAddWalletClick} />
            {wallets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-2xl border border-dashed"
                style={{ borderColor: C.border, background: C.card + "60" }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.gold + "18" }}>
                  <CreditCard size={22} color={C.gold} strokeWidth={1.8} />
                </div>
                <p className="text-[13px] font-medium text-center" style={{ color: C.tm }}>{t("dashboard.noWallets")}</p>
              </motion.div>
            ) : (
              <div
                className="flex md:grid md:grid-cols-3 gap-4 pb-1 -mx-5 px-5 md:mx-0 md:px-0"
                style={{ overflowX: "auto", scrollbarWidth: "none" }}
              >
                {wallets.map((w, idx) => (
                  <motion.div
                    key={w.id}
                    onClick={() => onEditWalletClick(w)}
                    className="flex-shrink-0 w-52 md:w-auto p-5 rounded-2xl cursor-pointer relative overflow-hidden group border transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${w.accent}22 0%, rgba(20, 20, 24, 0.95) 100%)`,
                      borderColor: `${w.accent}44`,
                      boxShadow: `0 8px 24px ${w.accent}12`,
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.35 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Card Background Glow */}
                    <div
                      className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full pointer-events-none filter blur-2xl opacity-40 transition-opacity group-hover:opacity-70"
                      style={{ background: w.accent }}
                    />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ background: w.accent + "25", color: w.accent }}>
                        {t("common.card")}
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                        style={{ background: w.accent }}
                      >
                        <CreditCard size={13} color={C.bg} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 mb-2 relative z-10">
                      <span
                        className="text-[20px] font-bold tracking-tight"
                        style={{ color: C.white }}
                      >
                        {formatCurrency(w.balance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                      <p className="text-[12px] font-medium" style={{ color: C.t2 }}>
                        {w.label}
                      </p>
                      <span className="text-[10px] font-mono tracking-widest opacity-60 text-white">
                        •••• 8842
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transactions */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <SectionHeader title={t("dashboard.recentTransactions")} />
          <p
            className="text-[12px] font-semibold mb-1"
            style={{ color: C.tm }}
          >
            {t("common.today")}
          </p>
          <Card className="overflow-hidden">
            {transactions.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center p-8 text-center text-sm font-sans"
                style={{ color: C.tm, background: C.card }}
              >
                <TrendingUp size={32} color={C.tm} className="opacity-50 mb-3" />
                {t("dashboard.noTransactions")}
              </div>
            ) : (
              transactions.map((tx, i) => {
                const isPositive = tx.amount > 0;
                const IconComponent = categoryIcons[tx.category] || categoryIcons.Others;
                const iconColor = categoryColors[tx.category] || categoryColors.Others;
                return (
                  <motion.div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-center gap-3 px-4 py-3.5 group transition-colors relative cursor-pointer"
                    style={{
                      borderBottom:
                        i < transactions.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.18 }}
                    whileHover={{ scale: 1.01, backgroundColor: C.surf + "60" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: iconColor + "1a" }}
                    >
                      <IconComponent
                        size={16}
                        color={iconColor}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold truncate"
                        style={{ color: C.white }}
                      >
                        {tx.name}
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{ color: C.tm }}
                      >
                        {tx.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPositive ? (
                        <ArrowUpRight size={13} color={C.green} strokeWidth={2.5} />
                      ) : (
                        <ArrowDownRight size={13} color={C.red} strokeWidth={2.5} />
                      )}
                      <span
                        className="text-[14px] font-bold font-mono"
                        style={{ color: isPositive ? C.green : C.red }}
                      >
                        {isPositive ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                      {/* Action buttons – shows on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1">
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); onEditTransaction(tx); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                          style={{ background: C.gold + "22" }}
                          whileHover={{ scale: 1.15, background: C.gold + "44" }}
                          whileTap={{ scale: 0.9 }}
                          title={t("common.edit", "Sửa")}
                        >
                          <Edit2 size={11} color={C.gold} strokeWidth={2.5} />
                        </motion.button>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); onDeleteTransaction(tx.id); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                          style={{ background: "#FF453A22" }}
                          whileHover={{ scale: 1.15, background: "#FF453A44" }}
                          whileTap={{ scale: 0.9 }}
                          title={t("common.delete", "Xóa")}
                        >
                          <Trash2 size={11} color="#FF453A" strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
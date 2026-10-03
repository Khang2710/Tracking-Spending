import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  BarChart2,
  TrendingUp,
  Plus,
  ChevronRight,
  CreditCard,
  House,
  Car,
  Fuel,
  Building2,
  ShoppingBag,
  Wallet,
  Users,
  Target,
  PiggyBank,
  Trophy,
  Sparkles,
  Trash2,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Settings,
  Loader2,
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Calendar,
} from "lucide-react";
import confetti from "canvas-confetti";
import SplitScreen from "./features/split-bill/SplitScreen";
import CashFlowCalendar from "./features/statistics/CashFlowCalendar";
import { useTranslation } from "react-i18next";
import { supabase } from "./lib/supabase";
import { HomeScreen as PaperHomeScreen } from "./features/home/HomeScreen";
import { AppShell } from "./layout/AppShell";
import type { AppDestination } from "./layout/navigation";
import type { RecurringExpense } from "./features/recurring-expenses/recurring.types";
import { advanceMonthlyDueDate, getUpcomingOccurrences } from "./features/recurring-expenses/recurring.schedule";
import { RecurringExpensesSettings } from "./features/recurring-expenses/RecurringExpensesSettings";
import { MonthSelector } from "./features/statistics/MonthSelector";
import { MonthlyStatisticsDashboard } from "./features/statistics/MonthlyStatisticsDashboard";
import { useAuth } from "./features/auth/AuthProvider";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";
import {
  createCloudSavingsGoal,
  createCloudTransaction,
  createCloudWallet,
  deleteCloudSavingsGoal,
  deleteCloudTransaction,
  deleteCloudWallet,
  loadCloudFinance,
  saveCloudBudget,
  updateCloudSavingsGoal,
  updateCloudTransaction,
  updateCloudWallet,
} from "./features/finance-data/finance.repository";
import { emptyCloudFinance } from "./features/finance-data/cloudWorkspaceState";
import { MobileFormSheet } from "./components/mobile/MobileFormSheet";
import { NEW_TRANSACTION_FORM_ID, NewTransactionForm } from "./features/transactions/NewTransactionForm";

export interface SavingsGoal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  deadline: string;
  status: "IN_PROGRESS" | "COMPLETED";
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const C = {
  bg: "#F4F3EF",
  sec: "#ECEBE5",
  card: "#FFFFFF",
  surf: "#F0EFEA",
  gold: "#171A16",
  goldL: "#30352E",
  high: "#191B17",
  purple: "#746783",
  green: "#4F7D62",
  red: "#A75D4D",
  white: "#191B17",
  t2: "#4F534D",
  tm: "#74786F",
  border: "rgba(25,27,23,0.10)",
} as const;

// ─── Interfaces & Mappings ──────────────────────────────────────────────────
export interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  category: string;
  walletId: number;
  note?: string | null;
}

export interface Wallet {
  id: number;
  label: string;
  balance: number;
  accent: string;
}



export const categoryIcons: Record<string, any> = {
  Food: UtensilsCrossed,
  Drinks: Coffee,
  Groceries: ShoppingBasket,
  Shopping: ShoppingBag,
  Fuel: Fuel,
  Investment: TrendingUp,
  Bank: Building2,
  Salary: Wallet,
  Housing: House,
  Entertainment: Car,
  Others: Plus,
};

export const categoryColors: Record<string, string> = {
  Food: "#FF7043",
  Drinks: "#4FC3F7",
  Groceries: "#66BB6A",
  Shopping: C.gold,
  Fuel: C.red,
  Investment: C.purple,
  Bank: C.green,
  Salary: C.green,
  Housing: C.gold,
  Entertainment: C.purple,
  Others: C.t2,
};

const initialChartData = [
  { m: "Jan", income: 0, outcome: 0, savings: 0 },
  { m: "Feb", income: 0, outcome: 0, savings: 0 },
  { m: "Mar", income: 0, outcome: 0, savings: 0 },
  { m: "Apr", income: 0, outcome: 0, savings: 0 },
  { m: "May", income: 0, outcome: 0, savings: 0 },
  { m: "Jun", income: 0, outcome: 0, savings: 0 },
  { m: "Jul", income: 0, outcome: 0, savings: 0 },
  { m: "Aug", income: 0, outcome: 0, savings: 0 },
  { m: "Sep", income: 0, outcome: 0, savings: 0 },
  { m: "Oct", income: 0, outcome: 0, savings: 0 },
  { m: "Nov", income: 0, outcome: 0, savings: 0 },
  { m: "Dec", income: 0, outcome: 0, savings: 0 },
];

const initialTransactions: Transaction[] = [];

const initialWallets: Wallet[] = [];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];



// ─── Reusable Components ──────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  style = {},
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${className}`}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: "0 14px 45px rgba(42, 45, 39, 0.055)",
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function TagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
      style={{
        background: color + "1a",
        color: color,
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  color = C.gold,
  delay = 0.2,
}: {
  value: number;
  max: number;
  color?: string;
  delay?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="h-2 rounded-full overflow-hidden relative"
      style={{ background: C.surf }}
    >
      <motion.div
        className="h-full rounded-full relative"
        style={{
          background: `linear-gradient(90deg, ${color}aa 0%, ${color} 100%)`,
          boxShadow: `0 0 10px ${color}66`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      />
    </div>
  );
}

function SectionHeader({
  title,
  actionLabel = "See All",
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span
        className="text-[17px] font-semibold tracking-tight"
        style={{ color: C.white }}
      >
        {title}
      </span>
      {onAction && (
        <button
          className="flex items-center gap-0.5 text-[13px] font-semibold transition-opacity active:opacity-60"
          style={{ color: C.gold }}
          onClick={onAction}
        >
          {actionLabel}
          {actionLabel === "See All" && <ChevronRight size={13} strokeWidth={2.5} />}
        </button>
      )}
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
// Helper to extract month index (0-11) and year from any date string
const parseDateInfo = (dateStr: string): { month: number; year: number } => {
  const now = new Date();
  const defaultRes = { month: now.getMonth(), year: now.getFullYear() };
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
        return { year: parts[0], month: Math.max(0, Math.min(11, parts[1] - 1)) };
      } else if (parts[2] > 1000) {
        // DD-MM-YYYY (e.g. 04-08-2026 => 04 is Day, 08 is Month, 2026 is Year)
        return { year: parts[2], month: Math.max(0, Math.min(11, parts[1] - 1)) };
      }
    }
  }

  // Fallback to standard JS Date parse for ISO strings
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { month: d.getMonth(), year: d.getFullYear() };
  }

  return defaultRes;
};

const getMonthIndexFromDate = (dateStr: string): number => {
  return parseDateInfo(dateStr).month;
};

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
interface HomeScreenProps {
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

function HomeScreen({
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
}: HomeScreenProps) {
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
                          title={t("common.edit")}
                        >
                          <Edit2 size={11} color={C.gold} strokeWidth={2.5} />
                        </motion.button>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); onDeleteTransaction(tx.id); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                          style={{ background: "#FF453A22" }}
                          whileHover={{ scale: 1.15, background: "#FF453A44" }}
                          whileTap={{ scale: 0.9 }}
                          title={t("common.delete")}
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

// ─── STATISTICS SCREEN ────────────────────────────────────────────────────────
interface StatisticsScreenProps {
  wallets: Wallet[];
  transactions: Transaction[];
  budget: number;
  savingsGoals: SavingsGoal[];
  availableBalance: number;
  totalBalance: number;
  onAddGoalClick: () => void;
  onDeposit: (goalId: number, amount: number) => void;
  onWithdraw: (goalId: number, amount: number) => void;
  onDeleteGoal: (goalId: number) => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction?: (tx: Transaction) => void;
}


function StatisticsScreen({
  wallets,
  transactions,
  budget,
  savingsGoals,
  availableBalance,
  totalBalance,
  onAddGoalClick,
  onDeposit,
  onWithdraw,
  onDeleteGoal,
  onDeleteTransaction,
  onEditTransaction,
}: StatisticsScreenProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [statsSubTab, setStatsSubTab] = useState<number>(0);

  // Compute dynamic chart data based on transactions
  const computedChartData = initialChartData.map((item, idx) => {
    const monthTx = transactions.filter((t) => getMonthIndexFromDate(t.date) === idx);
    let extraIncome = 0;
    let extraOutcome = 0;
    monthTx.forEach((t) => {
      if (t.amount > 0) {
        extraIncome += t.amount;
      } else {
        extraOutcome += Math.abs(t.amount);
      }
    });

    return {
      ...item,
      income: extraIncome,
      outcome: extraOutcome,
      savings: Math.max(0, extraIncome - extraOutcome),
    };
  });

  const activeMonthData = computedChartData[selectedMonth] || { income: 0, outcome: 0, savings: 0 };

  // Calculate dynamic budget details for the selected month
  const monthTransactions = transactions.filter((t) => getMonthIndexFromDate(t.date) === selectedMonth);
  const totalMonthOutcome = monthTransactions.reduce(
    (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
    0
  );
  const pctSpent = budget > 0 ? Math.min(Math.round((totalMonthOutcome / budget) * 100), 100) : 0;
  const saved = Math.max(0, budget - totalMonthOutcome);

  // Dynamic spending categories for selected month
  const categoryTotals: Record<string, number> = {};
  let monthTotalExpenses = 0;
  monthTransactions.forEach((t) => {
    if (t.amount < 0) {
      const amt = Math.abs(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
      monthTotalExpenses += amt;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([name, amount]) => {
      const pct = monthTotalExpenses > 0 ? Math.round((amount / monthTotalExpenses) * 100) : 0;
      return {
        name,
        amount,
        pct,
        color: categoryColors[name] || categoryColors.Others,
        Icon: categoryIcons[name] || categoryIcons.Others,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="px-5 pt-2 pb-5 md:hidden">
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{ color: C.white }}
        >
          Statistics
        </h1>
      </div>

      {/* Segmented Switcher */}
      <div className="px-5 md:px-0 pb-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {[
            { id: 0, label: t("stats.tabStats"), shortLabel: t("stats.tabStats"), icon: BarChart2 },
            { id: 1, label: t("stats.tabCashFlow"), shortLabel: t("stats.tabCashFlowShort"), icon: Calendar },
            { id: 2, label: t("stats.tabSavings"), shortLabel: t("stats.tabSavingsShort"), icon: PiggyBank },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = statsSubTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => setStatsSubTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer text-center relative whitespace-nowrap min-w-0"
                style={{
                  background: isActive ? C.gold : "transparent",
                  color: isActive ? C.bg : C.tm,
                  boxShadow: isActive ? "0 2px 10px rgba(201, 164, 91, 0.25)" : "none",
                }}
              >
                <IconComp size={14} strokeWidth={2.2} className="shrink-0" />
                <span className="truncate sm:hidden">{tab.shortLabel}</span>
                <span className="hidden truncate sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {statsSubTab === 1 && (
        <div className="px-5 md:px-0 pb-6">
          <CashFlowCalendar
            transactions={transactions}
            wallets={wallets}
            onDeleteTransaction={onDeleteTransaction}
            onEditTransaction={onEditTransaction}
          />
        </div>
      )}

      {statsSubTab === 2 && (
        <div className="px-5 md:px-0 pb-6">
          <SavingsGoalsScreen
            goals={savingsGoals}
            availableBalance={availableBalance}
            totalBalance={totalBalance}
            onAddGoalClick={onAddGoalClick}
            onDeposit={onDeposit}
            onWithdraw={onWithdraw}
            onDelete={onDeleteGoal}
          />
        </div>
      )}

      {statsSubTab === 0 && (
        <div className="space-y-4 px-4 pb-6 sm:px-5 md:px-0">
          <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} months={months} year={new Date().getFullYear()} />
          <MonthlyStatisticsDashboard
            monthLabel={new Date(new Date().getFullYear(), selectedMonth, 1).toLocaleString(undefined, { month: "long" })}
            monthShortLabel={months[selectedMonth]}
            year={new Date().getFullYear()}
            income={activeMonthData.income}
            spending={activeMonthData.outcome}
            savings={activeMonthData.savings}
            budget={budget}
            budgetPercent={pctSpent}
            dailyLimit={budget / 30}
            savedBudget={saved}
            transactionCount={monthTransactions.length}
            averageExpense={monthTotalExpenses > 0 ? monthTotalExpenses / monthTransactions.filter((transaction) => transaction.amount < 0).length : 0}
            categories={sortedCategories.map(({ name, amount, pct, color }) => ({ name, amount, pct, color }))}
            formatCurrency={formatCurrency}
            copy={{
              monthlyBreakdown: t("stats.monthlyBreakdown"), netBalance: t("stats.netBalance"), income: t("stats.income"), spending: t("stats.outcome"), savings: t("stats.savings"), spendingFocus: t("stats.spendingFocus"), whereMoneyWent: t("stats.mostMoneyGoesTo"), spendingPercent: t("stats.spendingPercent"), monthlySnapshot: t("stats.monthlySnapshot"), quietMonth: t("stats.quietMonth"), transactions: t("stats.transactions"), averageExpense: t("stats.averageExpense"), monthlyBudget: t("stats.monthlyBudget"), dailyLimit: t("stats.dailyLimit"), saved: t("stats.saved"), atAGlance: t("stats.atAGlance"), savingsRate: t("stats.savingsRate"), categories: t("stats.categories"), noExpenses: t("stats.noExpenses"),
            }}
          />
        </div>
      )}
    </div>
  );
}

const goalIconOptions = [
  { key: "PiggyBank", Icon: PiggyBank, label: "Hũ" },
  { key: "Car", Icon: Car, label: "Xe" },
  { key: "House", Icon: House, label: "Nhà" },
  { key: "TrendingUp", Icon: TrendingUp, label: "Đầu tư" },
  { key: "ShoppingBag", Icon: ShoppingBag, label: "Mua sắm" },
  { key: "CreditCard", Icon: CreditCard, label: "Thẻ" },
  { key: "Target", Icon: Target, label: "Mục tiêu" },
  { key: "Trophy", Icon: Trophy, label: "Thành tích" },
];

const goalColorOptions = [
  { label: "Gold", value: C.gold },
  { label: "Purple", value: C.purple },
  { label: "Green", value: C.green },
  { label: "Red", value: C.red },
  { label: "Blue", value: "#3B82F6" },
  { label: "Pink", value: "#EC4899" },
];

function resolveGoalIcon(iconKey: string) {
  return goalIconOptions.find((o) => o.key === iconKey)?.Icon || PiggyBank;
}

// ─── GOAL CARD ────────────────────────────────────────────────────────────────
function SavingsGoalCard({
  goal,
  onClick,
}: {
  goal: SavingsGoal;
  onClick: (g: SavingsGoal) => void;
}) {
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation();
  const currentAmount = typeof goal?.currentAmount === "number" ? goal.currentAmount : Number(goal?.currentAmount) || 0;
  const targetAmount = typeof goal?.targetAmount === "number" ? goal.targetAmount : Number(goal?.targetAmount) || 0;
  const pct = targetAmount > 0
    ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
    : 0;
  const GoalIcon = resolveGoalIcon(goal?.icon || "PiggyBank");
  const isCompleted = goal?.status === "COMPLETED";
  const daysLeftRaw = goal?.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const daysLeft = daysLeftRaw !== null && !isNaN(daysLeftRaw) ? Math.max(0, daysLeftRaw) : null;
  const color = goal?.color || C.gold;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(goal)}
      className="cursor-pointer"
    >
      <Card className="p-5" style={{ position: "relative", overflow: "hidden" }}>
        {isCompleted && (
          <div
            className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold flex items-center gap-1"
            style={{ background: C.green, color: C.bg }}
          >
            <Trophy size={10} /> DONE
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: color + "22" }}
            >
              <GoalIcon size={20} color={color} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: C.white }}>
                {goal?.title || t("stats.goal")}
              </p>
              {daysLeft !== null && (
                <p className="text-[11px] mt-0.5" style={{ color: isCompleted ? C.green : daysLeft < 30 ? C.red : C.tm }}>
                  {isCompleted ? t("stats.completedExclamation") : daysLeft === 0 ? t("stats.expiredToday") : t("stats.daysRemaining", { count: daysLeft })}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold" style={{ color: color }}>
              {pct}%
            </p>
          </div>
        </div>

        {/* Gradient Progress Bar */}
        <div
          className="h-2.5 rounded-full overflow-hidden mb-3"
          style={{ background: C.surf }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isCompleted
                ? `linear-gradient(90deg, ${C.green} 0%, ${C.goldL} 100%)`
                : `linear-gradient(90deg, ${color} 0%, ${color}bb 100%)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px]" style={{ color: C.tm }}>
            {formatCurrency(currentAmount)}
          </span>
          <span className="text-[12px] font-semibold" style={{ color: C.t2 }}>
            / {formatCurrency(targetAmount)}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── GOAL ACTION MODAL ────────────────────────────────────────────────────────
function GoalActionModal({
  goal,
  availableBalance,
  onDeposit,
  onWithdraw,
  onDelete,
  onClose,
}: {
  goal: SavingsGoal;
  availableBalance: number;
  onDeposit: (goalId: number, amount: number) => void;
  onWithdraw: (goalId: number, amount: number) => void;
  onDelete: (goalId: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const currentAmount = typeof goal?.currentAmount === "number" ? goal.currentAmount : Number(goal?.currentAmount) || 0;
  const targetAmount = typeof goal?.targetAmount === "number" ? goal.targetAmount : Number(goal?.targetAmount) || 0;
  const pct = targetAmount > 0
    ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
    : 0;
  const color = goal?.color || C.gold;
  const GoalIcon = resolveGoalIcon(goal?.icon || "PiggyBank");

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    if (mode === "deposit") {
      if (num > availableBalance) return;
      onDeposit(goal.id, num);
    } else {
      if (num > currentAmount) return;
      onWithdraw(goal.id, num);
    }
    onClose();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Goal Info */}
      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: C.surf }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + "22" }}>
          <GoalIcon size={20} color={color} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold" style={{ color: C.white }}>{goal?.title || "Mục tiêu"}</p>
          <p className="text-[12px]" style={{ color: C.tm }}>
            {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)} · {pct}%
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: C.surf }}>
        {(["deposit", "withdraw"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer"
            style={{
              background: mode === m ? (m === "deposit" ? C.green : C.red) : "transparent",
              color: mode === m ? C.bg : C.tm,
            }}
          >
            {m === "deposit" ? `💰 ${t("stats.deposit")}` : `💸 ${t("stats.withdraw")}`}
          </button>
        ))}
      </div>

      {/* Balance Info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px]" style={{ color: C.tm }}>
          {mode === "deposit" ? t("stats.availableBalance") : t("stats.goalBalance")}
        </span>
        <span className="text-[13px] font-bold" style={{ color: mode === "deposit" ? C.green : C.gold }}>
          {formatCurrency(mode === "deposit" ? availableBalance || 0 : currentAmount)}
        </span>
      </div>

      {/* Amount Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: C.surf, border: `1px solid ${C.border}` }}
      >
        <span className="text-[18px] font-bold" style={{ color: C.tm }}>$</span>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-transparent text-[18px] font-bold outline-none"
          style={{ color: C.white }}
          autoFocus
        />
      </div>

      {/* Validation error */}
      {amount && parseFloat(amount) > (mode === "deposit" ? availableBalance : goal.currentAmount) && (
        <p className="text-[12px]" style={{ color: C.red }}>
          ⚠ Không đủ {mode === "deposit" ? "số dư khả dụng" : "số dư trong hũ"}
        </p>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-2xl font-bold text-[15px] transition-all cursor-pointer"
        style={{
          background: mode === "deposit" ? C.green : C.red,
          color: C.bg,
          opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
        }}
      >
        {mode === "deposit" ? "Nạp tiền vào hũ" : "Rút tiền khỏi hũ"}
      </button>

      {/* Delete */}
      <button
        onClick={() => { onDelete(goal.id); onClose(); }}
        className="flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer py-2 rounded-xl transition-all hover:bg-red-500/10"
        style={{ color: C.red }}
      >
        <Trash2 size={14} /> Xóa hũ tiết kiệm này
      </button>
    </div>
  );
}

// ─── ADD GOAL MODAL ────────────────────────────────────────────────────────────
function AddGoalModal({
  onAdd,
}: {
  onAdd: (goal: Omit<SavingsGoal, "id" | "status">) => void;
}) {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("PiggyBank");
  const [selectedColor, setSelectedColor] = useState<string>(C.gold);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    const num = parseFloat(targetAmount);
    if (isNaN(num) || num <= 0) return;
    onAdd({
      title,
      targetAmount: num,
      currentAmount: 0,
      icon: selectedIcon,
      color: selectedColor,
      deadline: deadline || "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Icon and Color Row */}
      <div className="flex flex-col gap-3">
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>CHỌN BIỂU TƯỢNG</label>
        <div className="flex flex-wrap gap-2">
          {goalIconOptions.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedIcon(key)}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: selectedIcon === key ? selectedColor + "33" : C.surf,
                border: `2px solid ${selectedIcon === key ? selectedColor : "transparent"}`,
              }}
            >
              <Icon size={18} color={selectedIcon === key ? selectedColor : C.tm} strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>CHỌN MÀU SẮC</label>
        <div className="flex gap-2">
          {goalColorOptions.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedColor(value)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
              style={{ background: value }}
            >
              {selectedColor === value && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.5 2.5L10 3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>TÊN MỤC TIÊU</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Mua iPhone 16, Du lịch Nhật..."
          className="px-4 py-3 rounded-xl text-[14px] outline-none"
          style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.white }}
          required
        />
      </div>

      {/* Target Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>SỐ TIỀN MỤC TIÊU</label>
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: C.surf, border: `1px solid ${C.border}` }}
        >
          <span style={{ color: C.tm }}>$</span>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: C.white }}
            required
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>NGÀY HẠN ĐỊNH (Tùy chọn)</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="px-4 py-3 rounded-xl text-[14px] outline-none"
          style={{
            background: C.surf,
            border: `1px solid ${C.border}`,
            color: C.white,
            colorScheme: "dark",
          }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-2xl font-bold text-[15px] mt-2 cursor-pointer transition-all"
        style={{ background: C.gold, color: C.bg }}
      >
        Tạo hũ tiết kiệm
      </button>
    </form>
  );
}

// ─── SAVINGS GOALS SCREEN ──────────────────────────────────────────────────────
interface SavingsGoalsScreenProps {
  goals: SavingsGoal[];
  availableBalance: number;
  totalBalance: number;
  onAddGoalClick: () => void;
  onDeposit: (goalId: number, amount: number) => void;
  onWithdraw: (goalId: number, amount: number) => void;
  onDelete: (goalId: number) => void;
}

function SavingsGoalsScreen({
  goals,
  availableBalance,
  totalBalance,
  onAddGoalClick,
  onDeposit,
  onWithdraw,
  onDelete,
}: SavingsGoalsScreenProps) {
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const completedCount = goals.filter((g) => g.status === "COMPLETED").length;
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Banner */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12px] font-medium mb-0.5" style={{ color: C.tm }}>{t("stats.availableBalance")}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold tracking-tight" style={{ color: C.white }}>
                {formatCurrency(availableBalance)}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: C.tm }}>
              {t("stats.totalBalance")}:{" "}
              <span style={{ color: C.t2, fontWeight: 600 }}>{formatCurrency(totalBalance)}</span>
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: C.gold + "1a" }}
          >
            <PiggyBank size={26} color={C.gold} strokeWidth={1.8} />
          </div>
        </div>

        {/* Progress Overview */}
        {goals.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px]" style={{ color: C.tm }}>
                {t("stats.totalProgress")}: {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}
              </span>
              <span className="text-[12px] font-bold" style={{ color: C.gold }}>{overallPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: C.surf }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${C.gold} 0%, ${C.green} 100%)` }}
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: C.gold }} />
                <span className="text-[11px]" style={{ color: C.tm }}>{goals.length} {t("stats.goals")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: C.green }} />
                <span className="text-[11px]" style={{ color: C.tm }}>{completedCount} {t("stats.completed")}</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: C.gold + "1a" }}
          >
            <PiggyBank size={32} color={C.gold} strokeWidth={1.8} />
          </div>
          <h3 className="text-[18px] font-bold mb-2" style={{ color: C.white }}>
            {t("stats.noSavingsGoals")}
          </h3>
          <p className="text-[13px] mb-6 max-w-xs" style={{ color: C.tm }}>
            {t("stats.createSavingsGoalHint")}
          </p>
          <motion.button
            onClick={onAddGoalClick}
            className="px-6 py-3 rounded-2xl font-bold text-[14px] flex items-center gap-2 cursor-pointer"
            style={{ background: C.gold, color: C.bg }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus size={16} />
            {t("stats.createFirstGoal")}
          </motion.button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold" style={{ color: C.white }}>
              {t("stats.savingsGoalList")}
            </h3>
            <motion.button
              onClick={onAddGoalClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold cursor-pointer"
              style={{ background: C.gold + "22", color: C.gold, border: `1px solid ${C.gold}33` }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={13} /> {t("stats.addGoal")}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                onClick={setSelectedGoal}
              />
            ))}
          </div>
        </>
      )}

      {/* Goal Action Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <Modal
            isOpen={!!selectedGoal}
            onClose={() => setSelectedGoal(null)}
            title={selectedGoal.title}
          >
            <GoalActionModal
              goal={selectedGoal}
              availableBalance={availableBalance}
              onDeposit={onDeposit}
              onWithdraw={onWithdraw}
              onDelete={onDelete}
              onClose={() => setSelectedGoal(null)}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BOTTOM NAVIGATION ────────────────────────────────────────────────────────
const navTabs = [
  { Icon: Home, label: "Home" },
  { Icon: BarChart2, label: "Stats" },
  { Icon: Users, label: "Split" },
];

function BottomNav({
  active,
  onChange,
}: {
  active: number;
  onChange: (i: number) => void;
}) {
  const { t } = useTranslation();
  const navTabs = [
    { Icon: Home, label: t("menu.home") },
    { Icon: BarChart2, label: t("menu.stats") },
    { Icon: Users, label: t("menu.split") },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#121212] z-50 border-t border-white/10 flex items-center justify-around px-2 backdrop-blur-lg">
      {navTabs.map(({ Icon, label }, i) => {
        const isActive = active === i;
        return (
          <motion.button
            key={label}
            onClick={() => onChange(i)}
            className="flex flex-col items-center justify-center gap-0.5 px-5 py-1.5 rounded-xl transition-all duration-200 relative cursor-pointer"
            style={{
              color: isActive ? C.gold : C.tm,
            }}
            whileTap={{ scale: 0.92 }}
          >
            <Icon
              size={20}
              color={isActive ? C.gold : C.tm}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span
              className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}
              style={{ color: isActive ? C.gold : C.tm }}
            >
              {label}
            </span>
            {isActive && (
              <motion.div
                className="absolute top-0 w-8 h-0.5 rounded-full"
                style={{ background: C.gold }}
                layoutId="bottomNavIndicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}

// ─── DESKTOP COMPONENTS ───────────────────────────────────────────────────────

function Sidebar({
  active,
  onChange,
  userName,
  onEditName,
}: {
  active: number;
  onChange: (i: number) => void;
  userName: string;
  onEditName: () => void;
}) {
  const { t } = useTranslation();
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  const navTabs = [
    { Icon: Home, label: t("menu.home") },
    { Icon: BarChart2, label: t("menu.stats") },
    { Icon: Users, label: t("menu.split") },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-50 bg-[#121212] border-r border-white/10 overflow-hidden">
      {/* Background Ambient Light */}
      <div
        className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none filter blur-3xl opacity-20"
        style={{ background: `radial-gradient(circle, ${C.gold} 0%, transparent 70%)` }}
      />

      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 relative z-10">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
            color: C.bg,
            boxShadow: `0 4px 14px ${C.gold}40`,
          }}
        >
          <Sparkles size={18} color={C.bg} />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-extrabold tracking-tight" style={{ color: C.white }}>
            Wealthy
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-tm uppercase">
            FINANCE PRO
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1.5 relative z-10 font-sans">
        {navTabs.map(({ Icon, label }, i) => {
          const isActive = active === i;
          return (
            <motion.button
              key={label}
              onClick={() => onChange(i)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 group relative cursor-pointer"
              style={{
                color: isActive ? C.white : C.tm,
              }}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveBackground"
                  className="absolute inset-0 rounded-2xl border"
                  style={{
                    background: `linear-gradient(90deg, ${C.gold}20 0%, ${C.gold}0a 100%)`,
                    borderColor: `${C.gold}35`,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
              <Icon
                size={18}
                color={isActive ? C.gold : C.tm}
                className="group-hover:text-white transition-colors relative z-10"
                strokeWidth={2}
              />
              <span
                className="font-bold text-[14px] relative z-10"
                style={{ color: isActive ? C.white : C.tm }}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  className="ml-auto w-2 h-2 rounded-full relative z-10 shadow-sm"
                  style={{ background: C.gold, boxShadow: `0 0 8px ${C.gold}` }}
                  layoutId="sidebarActive"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom User Card */}
      <div className="p-4 border-t border-white/10 font-sans cursor-pointer relative z-10" onClick={onEditName}>
        <div className="flex items-center gap-3 p-2.5 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-gold/20" style={{ background: C.surf + "40" }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md" style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`, color: C.bg }}>
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: C.green, borderColor: C.sec }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: C.white }}>{userName || "User Profile"}</p>
          </div>
          <ChevronRight size={15} color={C.tm} />
        </div>
      </div>
    </aside>
  );
}

import { useCurrency } from "./context/CurrencyContext";
import { parseAmountInput, toDisplayedAmount, toStoredAmount } from "./context/currencyAmounts";

function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "vi";

  const toggleLanguage = () => {
    if (currentLang.startsWith("vi")) {
      i18n.changeLanguage("en");
    } else {
      i18n.changeLanguage("vi");
    }
  };

  return (
    <motion.button
      onClick={toggleLanguage}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.white,
      }}
      title={currentLang.startsWith("vi") ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      <span>{currentLang.startsWith("vi") ? "🇻🇳 VI" : "🇺🇸 EN"}</span>
    </motion.button>
  );
}

function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <motion.button
      onClick={toggleCurrency}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.gold,
      }}
      title={currency === "VND" ? "Chuyển sang USD ($)" : "Chuyển sang VND (₫)"}
    >
      <span>{currency === "VND" ? "🇻🇳 ₫ VND" : "🇺🇸 $ USD"}</span>
    </motion.button>
  );
}

function SettingsForm({
  initialKey,
  onSave,
}: {
  initialKey: string;
  onSave: (key: string) => void;
}) {
  const [key, setKey] = useState(initialKey);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(key);
      }}
      className="flex flex-col gap-4 text-sm text-[var(--paper-ink)]"
    >
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-semibold text-tm">GEMINI API KEY</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Dán Gemini API Key của bạn vào đây..."
          className="w-full rounded-xl border border-[var(--paper-border)] bg-[var(--paper-canvas)] px-4 py-3 text-[var(--paper-ink)] outline-none"
          style={{ borderColor: C.border }}
        />
        <p className="text-[11px] text-tm leading-relaxed mt-1">
          Khóa API này sẽ được lưu trữ an toàn trong trình duyệt của bạn (localStorage). Cho phép ứng dụng gọi trực tiếp dịch vụ trí tuệ nhân tạo Gemini của Google để sáng tạo câu quote Gen Z mỏ hỗn đầy cảm lạnh mà không cần chạy server Java Backend.
        </p>
      </div>
      <button
        type="submit"
        className="w-full py-3 rounded-2xl font-bold text-[14px] cursor-pointer transition-all mt-2"
        style={{
          background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
          color: C.bg,
          boxShadow: `0 4px 14px ${C.gold}33`,
        }}
      >
        Lưu cấu hình
      </button>
    </form>
  );
}

// ─── MODAL COMPONENTS ─────────────────────────────────────────────────────────
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Dialog Container */}
          <motion.div
            className="paper-ledger paper-dialog relative w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl border"
            style={{ background: C.card, borderColor: C.border }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[var(--paper-ink)]" style={{ color: C.high }}>{title}</h3>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-medium text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
              >
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function EditTransactionForm({
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
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
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
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
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
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
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
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
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
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
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
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

function AddWalletForm({
  onAdd,
}: {
  onAdd: (wallet: Omit<Wallet, "id">) => void;
}) {
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("");
  const [accent, setAccent] = useState<string>(C.purple);

  const colors = [
    { label: "Purple", value: C.purple },
    { label: "Green", value: C.green },
    { label: "Gold", value: C.gold },
    { label: "Red", value: C.red },
    { label: "Blue", value: "#3B82F6" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !balance) return;
    const numBal = parseFloat(balance);
    if (isNaN(numBal) || numBal < 0) return;

    onAdd({
      label,
      balance: numBal,
      accent,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Wallet Name / Label</label>
        <input
          type="text"
          required
          placeholder="e.g. Card 5678 or Travel Cash"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Initial Balance ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Accent Color</label>
        <div className="flex gap-3 py-1">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAccent(c.value)}
              className="w-7 h-7 rounded-full transition-transform relative flex items-center justify-center cursor-pointer"
              style={{ background: c.value }}
            >
              {accent === c.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-white block" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer"
        style={{ background: C.gold, color: C.bg }}
      >
        Create Wallet
      </button>
    </form>
  );
}

function EditWalletForm({
  wallet,
  onSave,
  onDelete,
}: {
  wallet: Wallet;
  onSave: (updated: Wallet) => void;
  onDelete?: (id: number) => void;
}) {
  const [label, setLabel] = useState(wallet.label);
  const [balance, setBalance] = useState(wallet.balance.toString());
  const [accent, setAccent] = useState(wallet.accent);

  const colors = [
    { label: "Purple", value: C.purple },
    { label: "Green", value: C.green },
    { label: "Gold", value: C.gold },
    { label: "Red", value: C.red },
    { label: "Blue", value: "#3B82F6" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !balance) return;
    const numBal = parseFloat(balance);
    if (isNaN(numBal)) return;

    onSave({
      ...wallet,
      label,
      balance: numBal,
      accent,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Wallet Name / Label</label>
        <input
          type="text"
          required
          placeholder="e.g. Card 5678 or Travel Cash"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Balance ($)</label>
        <input
          type="number"
          step="0.01"
          required
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Accent Color</label>
        <div className="flex gap-3 py-1">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAccent(c.value)}
              className="w-7 h-7 rounded-full transition-transform relative flex items-center justify-center cursor-pointer"
              style={{ background: c.value }}
            >
              {accent === c.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-white block" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(wallet.id)}
            className="flex-1 py-3 rounded-xl font-bold border border-solid border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/10 cursor-pointer bg-transparent transition-colors"
          >
            Delete
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl font-bold transition-all cursor-pointer"
          style={{ background: C.gold, color: C.bg }}
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}



function EditProfileForm({
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

function EditBudgetForm({
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


// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t, i18n } = useTranslation();
  const { formatCurrency, currency } = useCurrency();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AppDestination>("home");
  const scrollRef = useRef<HTMLDivElement>(null);

  // User Onboarding State
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("wealthy_user_name") || "";
  });

  // States with localStorage Sync
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_transactions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error reading transactions from localStorage", e);
    }
    return initialTransactions;
  });

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_wallets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading wallets from localStorage", e);
    }
    return initialWallets;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_savings_goals");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out old demo sample goals if present
          const cleanGoals = parsed.filter(
            (g: any) => g?.title !== "Buy Tesla Model 3" && g?.title !== "Emergency Fund"
          );
          return cleanGoals.map((g: any, i: number) => ({
            id: typeof g?.id === "number" ? g.id : i + 1,
            title: g?.title || "Hũ " + (i + 1),
            targetAmount: typeof g?.targetAmount === "number" ? g.targetAmount : Number(g?.targetAmount) || 0,
            currentAmount: typeof g?.currentAmount === "number" ? g.currentAmount : Number(g?.currentAmount) || 0,
            icon: g?.icon || "PiggyBank",
            color: g?.color || C.gold,
            deadline: g?.deadline || "",
            status: g?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
          }));
        }
      }
    } catch (e) {
      console.error("Error reading savings goals from localStorage", e);
    }
    return [];
  });

  const [budget, setBudget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_budget");
      if (saved !== null) {
        const num = Number(saved);
        if (!isNaN(num) && num >= 0) {
          if (num === 1000000 || num === 1000 || num === 820) return 0;
          return num;
        }
      }
    } catch (e) {
      console.error("Error reading budget from localStorage", e);
    }
    return 0;
  });

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_recurring_expenses");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error reading recurring expenses from localStorage", error);
      return [];
    }
  });
  const [handledOccurrenceIds, setHandledOccurrenceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_recurring_occurrences");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error reading recurring occurrences from localStorage", error);
      return [];
    }
  });
  const walletCloudIdsRef = useRef(new Map<number, string>());
  const pendingWalletCreatesRef = useRef(new Map<number, Promise<string>>());
  const transactionCloudIdsRef = useRef(new Map<number, string>());
  const savingsGoalCloudIdsRef = useRef(new Map<number, string>());
  const budgetCloudIdRef = useRef<string | null>(null);
  const [cloudLoadError, setCloudLoadError] = useState("");
  const [cloudLoadStatus, setCloudLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [cloudReloadAttempt, setCloudReloadAttempt] = useState(0);
  const isCurrentUserReady = cloudLoadStatus === "ready" && loadedUserId === user?.id;

  useEffect(() => {
    if (!user) return;
    void supabase.from("tracker_profiles").upsert({
      id: user.id,
      preferred_language: i18n.language?.startsWith("vi") ? "vi" : "en",
      preferred_currency: currency,
    }).then(({ error }) => {
      if (error) console.error("Unable to persist user preferences", error);
    });
  }, [currency, i18n.language, user]);
  const handledOccurrenceIdsRef = useRef(new Set(handledOccurrenceIds));

  const [searchQuery, setSearchQuery] = useState("");

  // Modal Visibility States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const transactionReturnFocusRef = useRef<HTMLElement | null>(null);
  const openTransactionSheet = (returnFocusTo?: HTMLElement | null) => {
    transactionReturnFocusRef.current = returnFocusTo ?? null;
    setIsTxModalOpen(true);
  };
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [selectedTxToEdit, setSelectedTxToEdit] = useState<Transaction | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isEditWalletModalOpen, setIsEditWalletModalOpen] = useState(false);
  const [selectedWalletToEdit, setSelectedWalletToEdit] = useState<Wallet | null>(null);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedGoalToAction, setSelectedGoalToAction] = useState<SavingsGoal | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Track transaction IDs applied to wallet balances
  const [appliedTxIds, setAppliedTxIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_applied_tx_ids");
      if (saved) return JSON.parse(saved);
      const existingSavedTxs = localStorage.getItem("wealthy_v2_transactions");
      if (existingSavedTxs) {
        const parsed: Transaction[] = JSON.parse(existingSavedTxs);
        if (Array.isArray(parsed)) {
          // Non-SplitBill transactions like "cơm" were already applied to wallet balance
          return parsed.filter((t) => !t.name.startsWith("Chia bill")).map((t) => t.id);
        }
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (!isCurrentUserReady) return;
    localStorage.setItem("wealthy_v2_transactions", JSON.stringify(transactions));
  }, [isCurrentUserReady, transactions]);

  useEffect(() => {
    if (!isCurrentUserReady) return;
    localStorage.setItem("wealthy_v2_wallets", JSON.stringify(wallets));
  }, [isCurrentUserReady, wallets]);

  useEffect(() => {
    if (!isCurrentUserReady) return;
    localStorage.setItem("wealthy_v2_savings_goals", JSON.stringify(savingsGoals));
  }, [isCurrentUserReady, savingsGoals]);

  useEffect(() => {
    if (!isCurrentUserReady) return;
    localStorage.setItem("wealthy_v2_budget", budget.toString());
  }, [budget, isCurrentUserReady]);

  useEffect(() => {
    if (!isCurrentUserReady) return;
    localStorage.setItem("wealthy_v2_applied_tx_ids", JSON.stringify(appliedTxIds));
  }, [appliedTxIds, isCurrentUserReady]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_recurring_expenses", JSON.stringify(recurringExpenses));
  }, [recurringExpenses]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_recurring_occurrences", JSON.stringify(handledOccurrenceIds));
  }, [handledOccurrenceIds]);

  // Reconcile unapplied transactions (e.g. Split Bill transactions) to active wallet balance
  useEffect(() => {
    if (wallets.length > 0 && transactions.length > 0) {
      const activeWallet = wallets[0];
      const appliedSet = new Set(appliedTxIds);
      const unappliedTxs = transactions.filter((t) => !appliedSet.has(t.id));

      if (unappliedTxs.length > 0) {
        let adjustment = 0;
        const newAppliedIds = [...appliedTxIds];

        unappliedTxs.forEach((t) => {
          adjustment += t.amount;
          newAppliedIds.push(t.id);
        });

        setWallets((prev) =>
          prev.map((w) =>
            w.id === activeWallet.id
              ? { ...w, balance: Math.round((w.balance + adjustment) * 100) / 100 }
              : w
          )
        );

        setAppliedTxIds(newAppliedIds);
      }
    }
  }, [wallets, transactions, appliedTxIds]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    const emptyData = emptyCloudFinance();

    setCloudLoadStatus("loading");
    setLoadedUserId(null);
    setCloudLoadError("");
    walletCloudIdsRef.current = emptyData.walletCloudIds;
    transactionCloudIdsRef.current = emptyData.transactionCloudIds;
    savingsGoalCloudIdsRef.current = emptyData.savingsGoalCloudIds;
    budgetCloudIdRef.current = emptyData.budgetCloudId;
    setWallets(emptyData.wallets);
    setTransactions(emptyData.transactions);
    setSavingsGoals(emptyData.savingsGoals);
    setBudget(emptyData.budget);
    setAppliedTxIds([]);

    void loadCloudFinance()
      .then((cloudData) => {
        if (cancelled) return;
        applyCloudFinance(cloudData);
        setCloudLoadError("");
        setLoadedUserId(user?.id ?? null);
        setCloudLoadStatus("ready");
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load cloud finance data", error);
          setCloudLoadError(i18n.language?.startsWith("vi") ? "Không thể tải dữ liệu đã đồng bộ. Hãy thử lại." : "Cloud data could not be loaded. Please try again.");
          setCloudLoadStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  // Changing the display language must not reload the financial workspace.
  // The previous dependency caused a second cloud bootstrap after AuthProvider
  // restored the user's language, which looked like an automatic page refresh.
  }, [user?.id, cloudReloadAttempt]);

  // Handle username edit
  const handleEditName = () => {
    setIsProfileModalOpen(true);
  };

  const reportCloudSaveError = (error: unknown) => {
    console.error("Unable to save cloud finance data", error);
    setCloudLoadError(i18n.language?.startsWith("vi") ? "Không thể lưu dữ liệu lên cloud. Hãy thử lại." : "Cloud data could not be saved. Please try again.");
  };

  const applyCloudFinance = (cloudData: Awaited<ReturnType<typeof loadCloudFinance>>) => {
    walletCloudIdsRef.current = cloudData.walletCloudIds;
    transactionCloudIdsRef.current = cloudData.transactionCloudIds;
    savingsGoalCloudIdsRef.current = cloudData.savingsGoalCloudIds;
    budgetCloudIdRef.current = cloudData.budgetCloudId;
    setWallets(cloudData.wallets);
    setTransactions(cloudData.transactions);
    setSavingsGoals(cloudData.savingsGoals);
    setBudget(cloudData.budget);
    setAppliedTxIds(cloudData.transactions.map((transaction) => transaction.id));
  };

  const refreshCloudFinance = async () => {
    const cloudData = await loadCloudFinance();
    applyCloudFinance(cloudData);
    setCloudLoadError("");
  };

  // Handle addition of a transaction
  const handleAddTransaction = async (newTx: Omit<Transaction, "id">, walletId?: number) => {
    const validWallet = wallets.find((w) => w.id === (walletId || newTx.walletId)) || wallets[0];
    const targetWalletId = validWallet ? validWallet.id : (walletId || newTx.walletId || 1);

    try {
      const walletToUse = validWallet ?? { id: targetWalletId, label: "Main Wallet", balance: 0, accent: C.purple };
      let walletCloudId = walletCloudIdsRef.current.get(targetWalletId);
      if (!walletCloudId) {
        const pendingCreate = pendingWalletCreatesRef.current.get(targetWalletId);
        walletCloudId = pendingCreate
          ? await pendingCreate
          : await createCloudWallet(walletToUse);
        walletCloudIdsRef.current.set(targetWalletId, walletCloudId);
      }
      await createCloudTransaction({ ...newTx, walletId: targetWalletId, id: 0 }, walletCloudId);
      await refreshCloudFinance();
      setIsTxModalOpen(false);
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleAddRecurringExpense = (expense: Omit<RecurringExpense, "id">) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `recurring-${Date.now()}`;
    setRecurringExpenses((current) => [...current, { ...expense, id }]);
  };

  const handleToggleRecurringExpense = (id: string) => {
    setRecurringExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, status: expense.status === "active" ? "paused" : "active" } : expense));
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  const handleConfirmRecurring = (occurrenceId: string) => {
    if (handledOccurrenceIdsRef.current.has(occurrenceId)) return;
    const expense = recurringExpenses.find((item) => `${item.id}:${item.nextDueDate}` === occurrenceId);
    if (!expense) return;

    handledOccurrenceIdsRef.current.add(occurrenceId);
    setHandledOccurrenceIds((current) => current.includes(occurrenceId) ? current : [...current, occurrenceId]);
    void handleAddTransaction({
      name: expense.name,
      amount: -Math.abs(expense.expectedAmount),
      date: expense.nextDueDate,
      category: expense.category,
      walletId: expense.walletId,
    }, expense.walletId);
    setRecurringExpenses((current) => current.map((item) => item.id === expense.id ? { ...item, nextDueDate: advanceMonthlyDueDate(item.nextDueDate, item.dayOfMonth) } : item));
  };

  // Handle deletion of a transaction (reverses wallet balance)
  const handleDeleteTransaction = async (txId: number) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    const transactionCloudId = transactionCloudIdsRef.current.get(txId);
    if (!transactionCloudId) return reportCloudSaveError(new Error("Transaction is not synchronized."));
    try {
      await deleteCloudTransaction(transactionCloudId);
      await refreshCloudFinance();
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleEditTxClick = (tx: Transaction) => {
    setSelectedTxToEdit(tx);
    setIsEditTxModalOpen(true);
  };

  const handleSaveTxEdit = async (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) return;
    const transactionCloudId = transactionCloudIdsRef.current.get(updatedTx.id);
    const walletCloudId = walletCloudIdsRef.current.get(updatedTx.walletId);
    if (!transactionCloudId || !walletCloudId) return reportCloudSaveError(new Error("Transaction is not synchronized."));
    try {
      await updateCloudTransaction(transactionCloudId, updatedTx, walletCloudId);
      await refreshCloudFinance();
      setIsEditTxModalOpen(false);
      setSelectedTxToEdit(null);
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  // Handle addition of a wallet
  const handleAddWallet = async (newWallet: Omit<Wallet, "id">) => {
    const nextId = Math.max(0, ...wallets.map((w) => w.id)) + 1;
    const wallet: Wallet = { ...newWallet, id: nextId };
    try {
      const createPromise = createCloudWallet(wallet);
      pendingWalletCreatesRef.current.set(wallet.id, createPromise);
      const cloudId = await createPromise;
      walletCloudIdsRef.current.set(wallet.id, cloudId);
      pendingWalletCreatesRef.current.delete(wallet.id);
      await refreshCloudFinance();
      setIsWalletModalOpen(false);
    } catch (error) {
      pendingWalletCreatesRef.current.delete(wallet.id);
      reportCloudSaveError(error);
    }
  };

  // Handle wallet edits, saves, and deletes
  const handleEditWalletClick = (wallet: Wallet) => {
    setSelectedWalletToEdit(wallet);
    setIsEditWalletModalOpen(true);
  };

  const handleSaveWallet = async (updatedWallet: Wallet) => {
    const walletCloudId = walletCloudIdsRef.current.get(updatedWallet.id);
    if (!walletCloudId) return reportCloudSaveError(new Error("Wallet is not synchronized."));
    try {
      await updateCloudWallet(walletCloudId, updatedWallet);
      await refreshCloudFinance();
      setIsEditWalletModalOpen(false);
      setSelectedWalletToEdit(null);
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleDeleteWallet = async (walletId: number) => {
    if (transactions.some((transaction) => transaction.walletId === walletId)) {
      return reportCloudSaveError(new Error("Delete this wallet's transactions first."));
    }
    const walletCloudId = walletCloudIdsRef.current.get(walletId);
    if (!walletCloudId) return reportCloudSaveError(new Error("Wallet is not synchronized."));
    try {
      await deleteCloudWallet(walletCloudId);
      await refreshCloudFinance();
      setIsEditWalletModalOpen(false);
      setSelectedWalletToEdit(null);
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  // Handle savings goals actions (add, deposit, withdraw, delete, confetti)
  const handleAddGoal = async (newGoal: Omit<SavingsGoal, "id" | "status">) => {
    const nextId = Math.max(0, ...savingsGoals.map((g) => g.id)) + 1;
    const goal: SavingsGoal = {
      ...newGoal,
      id: nextId,
      status: newGoal.currentAmount >= newGoal.targetAmount ? "COMPLETED" : "IN_PROGRESS",
    };

    try {
      const cloudId = await createCloudSavingsGoal(goal);
      savingsGoalCloudIdsRef.current.set(goal.id, cloudId);
      await refreshCloudFinance();
      setIsAddGoalModalOpen(false);
      if (goal.status === "COMPLETED") triggerConfetti();
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleDepositToGoal = async (goalId: number, amount: number) => {
    if (amount <= 0) return;
    const goal = savingsGoals.find((item) => item.id === goalId);
    const cloudId = savingsGoalCloudIdsRef.current.get(goalId);
    if (!goal || !cloudId) return reportCloudSaveError(new Error("Savings goal is not synchronized."));
    const currentAmount = Math.round((goal.currentAmount + amount) * 100) / 100;
    const updatedGoal = { ...goal, currentAmount, status: currentAmount >= goal.targetAmount ? "COMPLETED" as const : "IN_PROGRESS" as const };
    try {
      await updateCloudSavingsGoal(cloudId, updatedGoal);
      await refreshCloudFinance();
      if (updatedGoal.status === "COMPLETED" && goal.status !== "COMPLETED") triggerConfetti();
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleWithdrawFromGoal = async (goalId: number, amount: number) => {
    if (amount <= 0) return;
    const goal = savingsGoals.find((item) => item.id === goalId);
    const cloudId = savingsGoalCloudIdsRef.current.get(goalId);
    if (!goal || !cloudId) return reportCloudSaveError(new Error("Savings goal is not synchronized."));
    const currentAmount = Math.max(0, Math.round((goal.currentAmount - amount) * 100) / 100);
    const updatedGoal = { ...goal, currentAmount, status: currentAmount >= goal.targetAmount ? "COMPLETED" as const : "IN_PROGRESS" as const };
    try {
      await updateCloudSavingsGoal(cloudId, updatedGoal);
      await refreshCloudFinance();
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    const cloudId = savingsGoalCloudIdsRef.current.get(goalId);
    if (!cloudId) return reportCloudSaveError(new Error("Savings goal is not synchronized."));
    try {
      await deleteCloudSavingsGoal(cloudId);
      await refreshCloudFinance();
    } catch (error) {
      reportCloudSaveError(error);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  // Filter transactions by search query
  const filteredTransactions = transactions.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const activeSavingsSum = savingsGoals
    .filter((g) => g.status === "IN_PROGRESS")
    .reduce((sum, g) => sum + g.currentAmount, 0);
  const availableBalance = Math.max(0, totalBalance - activeSavingsSum);
  const upcomingExpenses = getUpcomingOccurrences(recurringExpenses, new Date(), 14)
    .filter((occurrence) => !handledOccurrenceIdsRef.current.has(occurrence.occurrenceId));

  if (!isCurrentUserReady) {
    const isVietnamese = i18n.language?.startsWith("vi");
    return (
      <>
        {cloudLoadStatus !== "error" ? <AppLoadingScreen label={isVietnamese ? "Đang đồng bộ không gian tài chính…" : "Syncing your financial workspace…"} /> : null}
        <main className={cloudLoadStatus === "error" ? "grid min-h-screen place-items-center bg-[var(--paper-canvas)] px-6 text-center text-[var(--paper-ink)]" : "hidden"}>
        <div className="max-w-sm rounded-3xl border border-[var(--paper-border)] bg-white p-6 shadow-[0_18px_50px_rgba(25,27,23,0.08)]">
          <h1 className="text-lg font-bold">
            {cloudLoadStatus === "error"
              ? (isVietnamese ? "Chưa thể tải dữ liệu" : "Unable to load your data")
              : (isVietnamese ? "Đang tải dữ liệu của bạn…" : "Loading your data…")}
          </h1>
          <p className="mt-2 text-sm font-medium text-[var(--paper-muted)]">
            {cloudLoadStatus === "error"
              ? cloudLoadError
              : (isVietnamese ? "Đang đồng bộ không gian tài chính riêng của bạn." : "Syncing your private financial workspace.")}
          </p>
          {cloudLoadStatus === "error" ? (
            <button
              type="button"
              onClick={() => setCloudReloadAttempt((attempt) => attempt + 1)}
              className="mt-5 min-h-11 rounded-full bg-[var(--paper-action)] px-5 text-sm font-bold text-white"
            >
              {isVietnamese ? "Thử lại" : "Try again"}
            </button>
          ) : null}
        </div>
        </main>
      </>
    );
  }

  const screen = activeTab === "home" ? (
    <PaperHomeScreen
      wallets={wallets}
      transactions={filteredTransactions.map((transaction) => ({ ...transaction, note: transaction.note ?? null }))}
      budget={budget}
      onEditBudget={() => setIsBudgetModalOpen(true)}
      onAddTransaction={() => openTransactionSheet()}
      onScanReceipt={() => setActiveTab("split-bill")}
      onAddWallet={() => setIsWalletModalOpen(true)}
      onEditWallet={handleEditWalletClick}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={handleEditTxClick}
      upcomingExpenses={upcomingExpenses}
      onConfirmRecurring={handleConfirmRecurring}
      onConfigureRecurring={() => setActiveTab("settings")}
    />
  ) : activeTab === "statistics" ? (
    <div className="min-h-[100dvh] bg-[var(--paper-canvas)] px-4 pb-32 pt-6 text-[var(--paper-ink)] md:px-8 md:pb-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <StatisticsScreen
          wallets={wallets}
          transactions={transactions}
          budget={budget}
          savingsGoals={savingsGoals}
          availableBalance={availableBalance}
          totalBalance={totalBalance}
          onAddGoalClick={() => setIsAddGoalModalOpen(true)}
          onDeposit={handleDepositToGoal}
          onWithdraw={handleWithdrawFromGoal}
          onDeleteGoal={handleDeleteGoal}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTxClick}
        />
      </div>
    </div>
  ) : activeTab === "split-bill" ? (
    <div className="min-h-[100dvh] bg-[var(--paper-canvas)] px-4 py-6 text-[var(--paper-ink)] md:px-8">
      <SplitScreen userName={userName} onAddTransaction={handleAddTransaction} />
    </div>
  ) : (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-10">
      <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-[var(--paper-ink)]">{t("menu.settings")}</h1>
      <p className="mt-2 text-sm font-medium text-[var(--paper-muted)]">
        {i18n.language?.startsWith("vi") ? "Tùy chỉnh trải nghiệm và kết nối của bạn." : "Customize your experience and connections."}
      </p>
      <div className="paper-surface mt-6 grid gap-5 rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--paper-border)] pb-5">
          <div>
            <h2 className="text-base font-bold text-[var(--paper-ink)]">{i18n.language?.startsWith("vi") ? "Ngôn ngữ & tiền tệ" : "Language & currency"}</h2>
            <p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{i18n.language?.startsWith("vi") ? "Cách số tiền và nội dung được hiển thị." : "How amounts and content are displayed."}</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--paper-action)] p-2"><CurrencyToggle /><LanguageToggle /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--paper-ink)]">{i18n.language?.startsWith("vi") ? "Hồ sơ & tích hợp" : "Profile & integrations"}</h2>
            <p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{userName || (i18n.language?.startsWith("vi") ? "Chưa đặt tên" : "No name set")}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleEditName} className="min-h-11 rounded-full border border-[var(--paper-border)] px-4 text-xs font-bold text-[var(--paper-ink)]">{i18n.language?.startsWith("vi") ? "Sửa hồ sơ" : "Edit profile"}</button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <RecurringExpensesSettings
          expenses={recurringExpenses}
          wallets={wallets}
          locale={i18n.language?.startsWith("vi") ? "vi-VN" : "en-US"}
          formatCurrency={formatCurrency}
          onAdd={handleAddRecurringExpense}
          onToggle={handleToggleRecurringExpense}
          onDelete={handleDeleteRecurringExpense}
        />
      </div>
    </main>
  );

  return (
    <>
      {cloudLoadError ? (
        <div className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-xl rounded-2xl border border-[#b42318]/20 bg-white px-4 py-3 text-sm font-medium text-[#8b1e16] shadow-lg">
          {cloudLoadError}
        </div>
      ) : null}
      <AppShell
        active={activeTab}
        onNavigate={setActiveTab}
        onAddTransaction={openTransactionSheet}
        onScanReceipt={() => setActiveTab("split-bill")}
        labels={{
          home: t("menu.home"),
          statistics: t("menu.stats"),
          splitBill: t("menu.split"),
          settings: t("menu.settings"),
          actions: i18n.language?.startsWith("vi") ? "Tác vụ nhanh" : "Quick actions",
          addTransaction: t("dashboard.newTransaction"),
          scanReceipt: i18n.language?.startsWith("vi") ? "Quét hóa đơn" : "Scan receipt",
          close: t("common.close"),
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      <MobileFormSheet
        open={isTxModalOpen}
        returnFocusTo={transactionReturnFocusRef.current}
        onOpenChange={setIsTxModalOpen}
        title={t("dashboard.newTransaction")}
        closeLabel={t("common.close")}
        description={i18n.language?.startsWith("vi") ? "Thêm khoản chi hoặc thu nhập" : "Add an expense or income transaction"}
        footer={(
          <button
            type="submit"
            form={NEW_TRANSACTION_FORM_ID}
            className="w-full cursor-pointer rounded-xl bg-[var(--paper-ink)] py-3 font-bold text-white transition-all"
          >
            {t("dashboard.saveTransaction")}
          </button>
        )}
      >
        <NewTransactionForm wallets={wallets} onSubmit={handleAddTransaction} />
      </MobileFormSheet>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={isEditTxModalOpen}
        onClose={() => {
          setIsEditTxModalOpen(false);
          setSelectedTxToEdit(null);
        }}
        title={t("dashboard.editTransaction")}
      >
        {selectedTxToEdit && (
          <EditTransactionForm
            transaction={selectedTxToEdit}
            wallets={wallets}
            onSave={handleSaveTxEdit}
            onDelete={(id) => {
              handleDeleteTransaction(id);
              setIsEditTxModalOpen(false);
              setSelectedTxToEdit(null);
            }}
          />
        )}
      </Modal>

      {/* Add Wallet Modal */}
      <Modal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} title={t("dashboard.activeWallets")}>
        <AddWalletForm onAdd={handleAddWallet} />
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal
        isOpen={isEditWalletModalOpen}
        onClose={() => {
          setIsEditWalletModalOpen(false);
          setSelectedWalletToEdit(null);
        }}
        title={`Edit Wallet: ${selectedWalletToEdit?.label}`}
      >
        {selectedWalletToEdit && (
          <EditWalletForm
            wallet={selectedWalletToEdit}
            onSave={handleSaveWallet}
            onDelete={wallets.length > 1 ? handleDeleteWallet : undefined}
          />
        )}
      </Modal>

      {/* Add Savings Goal Modal */}
      <Modal isOpen={isAddGoalModalOpen} onClose={() => setIsAddGoalModalOpen(false)} title="Tạo hũ tiết kiệm">
        <AddGoalModal
          onAdd={(goal) => {
            handleAddGoal(goal);
            setIsAddGoalModalOpen(false);
          }}
        />
      </Modal>

      {/* Edit Profile Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Edit Profile">
        <EditProfileForm
          initialName={userName}
          onSave={(newName) => {
            setUserName(newName);
            localStorage.setItem("wealthy_user_name", newName);
            setIsProfileModalOpen(false);
          }}
        />
      </Modal>

      {/* Edit Budget Modal */}
      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Edit Monthly Budget">
        <EditBudgetForm
          initialBudget={budget}
          onSave={async (newBudget) => {
            try {
              const savedBudget = await saveCloudBudget(newBudget);
              budgetCloudIdRef.current = savedBudget.id;
              await refreshCloudFinance();
              setIsBudgetModalOpen(false);
            } catch (error) {
              reportCloudSaveError(error);
            }
          }}
        />
      </Modal>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {!userName && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080809]">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div
                className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full filter blur-[120px]"
                style={{ background: `radial-gradient(circle, ${C.gold} 0%, transparent 70%)` }}
              />
              <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full filter blur-[120px]"
                style={{ background: `radial-gradient(circle, ${C.purple} 0%, transparent 70%)` }}
              />
            </div>

            <motion.div
              className="paper-ledger paper-dialog relative w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center"
              style={{ background: C.card, borderColor: C.border }}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div
                className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-xl font-bold mb-6"
                style={{
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
                  color: C.bg,
                }}
              >
                W
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 font-sans tracking-tight">
                Welcome to Wealthy
              </h2>
              <p className="text-sm text-tm mb-8">
                Your luxury personal expense and portfolio assistant. Let's start by setting up your name.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLFormElement;
                  const nameInput = target.elements.namedItem("name") as HTMLInputElement;
                  const val = nameInput.value.trim();
                  if (val) {
                    setUserName(val);
                    localStorage.setItem("wealthy_user_name", val);
                  }
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-xs text-tm font-medium uppercase tracking-wider pl-1">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    autoFocus
                    placeholder="Enter your name..."
                    className="w-full px-5 py-3.5 rounded-2xl outline-none border text-white bg-surf font-semibold transition-all focus:border-gold"
                    style={{ borderColor: C.border }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 rounded-2xl font-bold transition-all hover:brightness-110 cursor-pointer text-sm"
                  style={{ background: C.gold, color: C.bg }}
                >
                  Get Started
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

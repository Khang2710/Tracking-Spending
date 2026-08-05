import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  BarChart2,
  TrendingUp,
  Plus,
  ChevronRight,
  Download,
  Search,
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
  PieChart,
  Edit2,
  Settings,
  Loader2,
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import confetti from "canvas-confetti";
import SplitScreen from "./SplitScreen";
import { Drawer } from "vaul";
import { useTranslation } from "react-i18next";

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
  bg: "#0F0F10",
  sec: "#17171A",
  card: "#1E1E21",
  surf: "#242428",
  gold: "#C9A45B",
  goldL: "#E2C77A",
  high: "#F3D98B",
  purple: "#8B5CF6",
  green: "#3DDC84",
  red: "#FF6B6B",
  white: "#FFFFFF",
  t2: "#B8B8B8",
  tm: "#8A8A8A",
  border: "rgba(255,255,255,0.07)",
} as const;

// ─── Interfaces & Mappings ──────────────────────────────────────────────────
export interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  category: string;
  walletId: number;
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
        background: "linear-gradient(145deg, rgba(26, 26, 30, 0.8) 0%, rgba(18, 18, 22, 0.95) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
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

function MonthSelector({
  selected,
  onChange,
}: {
  selected: number;
  onChange: (i: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  return (
    <div
      className="flex rounded-2xl p-1 overflow-x-auto hide-scroll"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {months.map((m, i) => (
        <button
          key={m}
          onClick={() => onChange(i)}
          className="flex-1 min-w-[55px] py-2 rounded-xl flex flex-col items-center transition-all duration-300 border-0 cursor-pointer"
          style={{
            background: selected === i ? C.gold : "transparent",
            color: selected === i ? C.bg : C.tm,
          }}
        >
          <span
            className="text-[9px] font-medium opacity-60 leading-none mb-0.5"
            style={{ color: selected === i ? C.bg : C.tm }}
          >
            {currentYear}
          </span>
          <span
            className="text-[12px] font-semibold"
            style={{ color: selected === i ? C.bg : C.tm }}
          >
            {m}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl p-3 text-xs"
      style={{
        background: C.surf,
        border: `1px solid ${C.border}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <p className="font-semibold mb-2" style={{ color: C.t2 }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span style={{ color: C.white }}>
            ${p.value.toLocaleString()}
          </span>
        </div>
      ))}
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

  let progressColor = C.gold;
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
              whileTap={{ scale: 0.95 }}
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
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.gold }}
            whileTap={{ scale: 0.95 }}
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
          <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
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
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
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
              transactions.map((t, i) => {
                const isPositive = t.amount > 0;
                const IconComponent = categoryIcons[t.category] || categoryIcons.Others;
                const iconColor = categoryColors[t.category] || categoryColors.Others;
                return (
                  <motion.div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3.5 group transition-colors relative"
                    style={{
                      borderBottom:
                        i < transactions.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                    whileHover={{ backgroundColor: C.surf + "60" }}
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
                        {t.name}
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{ color: C.tm }}
                      >
                        {t.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPositive ? (
                        <ArrowUpRight size={13} color={C.green} strokeWidth={2.5} />
                      ) : (
                        <ArrowDownRight size={13} color={C.red} strokeWidth={2.5} />
                      )}
                      <span
                        className="text-[14px] font-bold"
                        style={{ color: isPositive ? C.green : C.red }}
                      >
                        {isPositive ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
                      </span>
                      {/* Delete button – shows on hover */}
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-1"
                        style={{ background: "#FF453A22" }}
                        whileHover={{ scale: 1.15, background: "#FF453A44" }}
                        whileTap={{ scale: 0.9 }}
                        title="Xóa giao dịch"
                      >
                        <Trash2 size={11} color="#FF453A" strokeWidth={2.5} />
                      </motion.button>
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
  transactions: Transaction[];
  budget: number;
  savingsGoals: SavingsGoal[];
  availableBalance: number;
  totalBalance: number;
  onAddGoalClick: () => void;
  onDeposit: (goalId: number, amount: number) => void;
  onWithdraw: (goalId: number, amount: number) => void;
  onDeleteGoal: (goalId: number) => void;
}


function StatisticsScreen({
  transactions,
  budget,
  savingsGoals,
  availableBalance,
  totalBalance,
  onAddGoalClick,
  onDeposit,
  onWithdraw,
  onDeleteGoal,
}: StatisticsScreenProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [statsView, setStatsView] = useState<"stats" | "goals">("stats");

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
      <div className="px-5 pt-12 pb-5 flex items-center justify-between md:hidden">
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{ color: C.white }}
        >
          Statistics
        </h1>
        <div className="flex items-center gap-2">
          {[Download, Search].map((Icon, i) => (
            <motion.button
              key={i}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
              whileTap={{ scale: 0.94 }}
            >
              <Icon size={16} color={C.t2} strokeWidth={2} />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Segmented Switcher */}
      <div className="px-5 md:px-0 pb-2">
        <div
          className="flex rounded-2xl p-1"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {(["stats", "goals"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setStatsView(v)}
              className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-300 cursor-pointer"
              style={{
                background: statsView === v ? C.gold : "transparent",
                color: statsView === v ? C.bg : C.tm,
              }}
            >
              {v === "stats" ? (
                <><BarChart2 size={14} /> {t("stats.tabStats")}</>
              ) : (
                <><PiggyBank size={14} /> {t("stats.tabSavings")}</>
              )}
            </button>
          ))}
        </div>
      </div>

      {statsView === "goals" ? (
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
      ) : (
      <div className="px-5 md:px-0 flex flex-col md:grid md:grid-cols-12 gap-5 md:gap-8 pb-6">
        {/* Left Column: Chart & Month Selector */}
        <div className="flex flex-col gap-5 md:gap-8 md:col-span-8">
          {/* Month Selector */}
          <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} />

          {/* Chart Card */}
          <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="p-4 md:p-6">
              <div className="h-52 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={computedChartData}
                    margin={{ top: 4, right: 4, bottom: 0, left: -22 }}
                  >
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.green} stopOpacity={0.28} />
                        <stop
                          offset="95%"
                          stopColor={C.green}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="gOutcome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.gold} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="m"
                      tick={{ fill: C.tm, fontSize: 11, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: C.tm, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke={C.green}
                      strokeWidth={2}
                      fill="url(#gIncome)"
                      dot={false}
                      activeDot={{ r: 4, fill: C.green, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="outcome"
                      stroke={C.red}
                      strokeWidth={2}
                      fill="url(#gOutcome)"
                      dot={false}
                      activeDot={{ r: 4, fill: C.red, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="savings"
                      stroke={C.gold}
                      strokeWidth={2}
                      fill="url(#gSavings)"
                      dot={false}
                      activeDot={{ r: 4, fill: C.gold, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Legend Row */}
              <div
                className="flex items-center justify-around md:justify-start md:gap-12 mt-4 pt-4"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                {[
                  { label: t("stats.income"), value: formatCurrency(activeMonthData.income), color: C.green },
                  { label: t("stats.outcome"), value: formatCurrency(activeMonthData.outcome), color: C.red },
                  { label: t("stats.savings"), value: formatCurrency(activeMonthData.savings), color: C.gold },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center md:items-start gap-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: item.color }}
                      />
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: C.tm }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      className="text-[15px] md:text-[18px] font-bold"
                      style={{ color: C.white }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Monthly Budget */}
          <motion.div whileHover={{ scale: 1.01 }}>
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[17px] font-semibold"
                  style={{ color: C.white }}
                >
                  {t("stats.monthlyBudget")}
                </span>
                <span
                  className="text-[13px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: C.gold + "22", color: C.gold }}
                >
                  {pctSpent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span
                  className="text-[22px] md:text-[28px] font-bold"
                  style={{ color: C.gold }}
                >
                  {formatCurrency(totalMonthOutcome)}
                </span>
                <span className="text-[14px] md:text-[16px]" style={{ color: C.tm }}>
                  / {formatCurrency(budget)}
                </span>
              </div>
              <ProgressBar value={totalMonthOutcome} max={budget} color={C.gold} delay={0.1} />
              <p className="text-[12px] md:text-[14px] mt-3" style={{ color: C.tm }}>
                {t("stats.dailyLimit")}: {formatCurrency(budget / 30)} ·{" "}
                <span style={{ color: C.green, fontWeight: 600 }}>
                  {t("stats.saved")} {formatCurrency(saved)}
                </span>
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Spending Categories */}
        <div className="md:col-span-4">
          <h3
            className="text-[17px] font-semibold mb-4"
            style={{ color: C.white }}
          >
            {t("stats.mostMoneyGoesTo")}
          </h3>
          <div className="flex flex-col gap-3 md:gap-4">
            {sortedCategories.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center p-8 text-center text-sm rounded-2xl border"
                style={{ color: C.tm, background: C.card, borderColor: C.border }}
              >
                <PieChart size={32} color={C.tm} className="opacity-50 mb-3" />
                {t("stats.noExpenses")}
              </div>
            ) : (
              sortedCategories.map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  whileHover={{ x: 4 }}
                >
                  <Card className="p-4 md:p-5 group cursor-pointer transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: cat.color + "1a" }}
                      >
                        <cat.Icon
                          size={18}
                          color={cat.color}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[15px] font-semibold"
                            style={{ color: C.white }}
                          >
                            {cat.name}
                          </span>
                          <span
                            className="text-[15px] font-bold"
                            style={{ color: C.red }}
                          >
                            -{formatCurrency(Math.abs(cat.amount))}
                          </span>
                        </div>
                        <span
                          className="text-[12px]"
                          style={{ color: C.tm }}
                        >
                          {cat.pct}% {t("stats.spendingPercent")}
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={cat.pct}
                      max={100}
                      color={cat.color}
                      delay={0.3 + i * 0.1}
                    />
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
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
                {goal?.title || "Mục tiêu"}
              </p>
              {daysLeft !== null && (
                <p className="text-[11px] mt-0.5" style={{ color: isCompleted ? C.green : daysLeft < 30 ? C.red : C.tm }}>
                  {isCompleted ? "Hoàn thành! 🎉" : daysLeft === 0 ? "Hết hạn hôm nay!" : `${daysLeft} ngày còn lại`}
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
            ${currentAmount.toLocaleString()} / ${targetAmount.toLocaleString()} · {pct}%
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
            {m === "deposit" ? "💰 Nạp tiền" : "💸 Rút tiền"}
          </button>
        ))}
      </div>

      {/* Balance Info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px]" style={{ color: C.tm }}>
          {mode === "deposit" ? "Số dư khả dụng" : "Số dư trong hũ"}
        </span>
        <span className="text-[13px] font-bold" style={{ color: mode === "deposit" ? C.green : C.gold }}>
          ${mode === "deposit"
            ? (availableBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
            : currentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
  const [selectedColor, setSelectedColor] = useState(C.gold);

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
            <p className="text-[12px] font-medium mb-0.5" style={{ color: C.tm }}>Số dư khả dụng</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-bold tracking-tight" style={{ color: C.white }}>
                ${availableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: C.tm }}>
              Tổng số dư:{" "}
              <span style={{ color: C.t2, fontWeight: 600 }}>${totalBalance.toLocaleString()}</span>
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
                Tiến độ tổng: ${totalSaved.toLocaleString()} / ${totalTarget.toLocaleString()}
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
                <span className="text-[11px]" style={{ color: C.tm }}>{goals.length} hũ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: C.green }} />
                <span className="text-[11px]" style={{ color: C.tm }}>{completedCount} hoàn thành</span>
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
            Chưa có hũ tiết kiệm nào
          </h3>
          <p className="text-[13px] mb-6 max-w-xs" style={{ color: C.tm }}>
            Tạo hũ tiết kiệm đầu tiên để bắt đầu theo dõi mục tiêu tài chính của bạn.
          </p>
          <motion.button
            onClick={onAddGoalClick}
            className="px-6 py-3 rounded-2xl font-bold text-[14px] flex items-center gap-2 cursor-pointer"
            style={{ background: C.gold, color: C.bg }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus size={16} />
            Tạo hũ đầu tiên
          </motion.button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold" style={{ color: C.white }}>
              Danh sách hũ tiết kiệm
            </h3>
            <motion.button
              onClick={onAddGoalClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold cursor-pointer"
              style={{ background: C.gold + "22", color: C.gold, border: `1px solid ${C.gold}33` }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={13} /> Thêm hũ
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <GoalCard
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
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.white,
      }}
      title={currentLang.startsWith("vi") ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      <span>{currentLang.startsWith("vi") ? "🇻🇳 VI" : "🇺🇸 EN"}</span>
    </button>
  );
}

function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <button
      onClick={toggleCurrency}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.gold,
      }}
      title={currency === "VND" ? "Chuyển sang USD ($)" : "Chuyển sang VND (₫)"}
    >
      <span>{currency === "VND" ? "🇻🇳 ₫ VND" : "🇺🇸 $ USD"}</span>
    </button>
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
      className="flex flex-col gap-4 text-white text-sm"
    >
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-semibold text-tm">GEMINI API KEY</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Dán Gemini API Key của bạn vào đây..."
          className="w-full px-4 py-3 rounded-xl outline-none border text-white bg-surf"
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
            className="relative w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl border"
            style={{ background: C.card, borderColor: C.border }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-[13px] font-medium text-tm hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
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

function getSmartCategoryFromTitle(title: string): string {
  const keyword = title.trim().toLowerCase();

  // 1. Food (Ăn uống, Cơm, Phở, Món ăn, GrabFood, Fast food...)
  if (
    keyword.includes("ăn") || keyword.includes("cơm") || keyword.includes("phở") ||
    keyword.includes("bún") || keyword.includes("bánh") || keyword.includes("hủ tiếu") ||
    keyword.includes("miến") || keyword.includes("cháo") || keyword.includes("lẩu") ||
    keyword.includes("nướng") || keyword.includes("buffet") || keyword.includes("nhà hàng") ||
    keyword.includes("quán ăn") || keyword.includes("suất ăn") || keyword.includes("đồ ăn") ||
    keyword.includes("snack") || keyword.includes("pizza") || keyword.includes("burger") ||
    keyword.includes("kfc") || keyword.includes("lotte") || keyword.includes("mcdonald") ||
    keyword.includes("jollibee") || keyword.includes("texas chicken") || keyword.includes("domino") ||
    keyword.includes("food") || keyword.includes("lunch") || keyword.includes("dinner") ||
    keyword.includes("breakfast") || keyword.includes("meal") || keyword.includes("dining") ||
    keyword.includes("restaurant") || keyword.includes("eat") || keyword.includes("noodle") ||
    keyword.includes("rice") || keyword.includes("soup") || keyword.includes("steak") ||
    keyword.includes("sushi") || keyword.includes("bbq") || keyword.includes("grabfood") ||
    keyword.includes("shopeefood") || keyword.includes("baemin") || keyword.includes("ốc") ||
    keyword.includes("bột chiên") || keyword.includes("ramen") || keyword.includes("dimsum")
  ) {
    return "Food";
  }

  // 2. Drinks (Đồ uống, Cà phê, Trà sữa, Nước giải khát...)
  if (
    keyword.includes("uống") || keyword.includes("trà") || keyword.includes("trà sữa") ||
    keyword.includes("boba") || keyword.includes("cf") || keyword.includes("cafe") ||
    keyword.includes("cà phê") || keyword.includes("nước") || keyword.includes("sinh tố") ||
    keyword.includes("nước ép") || keyword.includes("bia") || keyword.includes("rượu") ||
    keyword.includes("pub") || keyword.includes("bar") || keyword.includes("highlands") ||
    keyword.includes("phúc long") || keyword.includes("starbucks") || keyword.includes("coffee") ||
    keyword.includes("katinat") || keyword.includes("phê la") || keyword.includes("tocotoco") ||
    keyword.includes("gong cha") || keyword.includes("dingtea") || keyword.includes("mixue") ||
    keyword.includes("coca") || keyword.includes("pepsi") || keyword.includes("sting") ||
    keyword.includes("latte") || keyword.includes("matcha") || keyword.includes("cappuccino") ||
    keyword.includes("drink") || keyword.includes("drinks") || keyword.includes("beverage") ||
    keyword.includes("juice") || keyword.includes("smoothie") || keyword.includes("beer") ||
    keyword.includes("wine") || keyword.includes("soda") || keyword.includes("water") ||
    keyword.includes("nước mía") || keyword.includes("dừa") || keyword.includes("quán nước")
  ) {
    return "Drinks";
  }

  // 3. Groceries (Đi chợ, Siêu thị, WinMart, Bách hóa xanh, Nhu yếu phẩm...)
  if (
    keyword.includes("đi chợ") || keyword.includes("chợ") || keyword.includes("siêu thị") ||
    keyword.includes("winmart") || keyword.includes("bách hóa xanh") || keyword.includes("coopmart") ||
    keyword.includes("lotte mart") || keyword.includes("big c") || keyword.includes("aeon") ||
    keyword.includes("circle k") || keyword.includes("family mart") || keyword.includes("7 eleven") ||
    keyword.includes("gs25") || keyword.includes("thực phẩm") || keyword.includes("rau") ||
    keyword.includes("củ") || keyword.includes("quả") || keyword.includes("trái cây") ||
    keyword.includes("thịt tươi") || keyword.includes("cá tươi") || keyword.includes("trứng") ||
    keyword.includes("sữa") || keyword.includes("gạo") || keyword.includes("mắm") ||
    keyword.includes("dầu ăn") || keyword.includes("nhu yếu phẩm") || keyword.includes("grocery") ||
    keyword.includes("groceries") || keyword.includes("supermarket") || keyword.includes("produce") ||
    keyword.includes("vegetables") || keyword.includes("fruits") || keyword.includes("dairy") ||
    keyword.includes("milk") || keyword.includes("eggs") || keyword.includes("bread") ||
    keyword.includes("pantry") || keyword.includes("provisions")
  ) {
    return "Groceries";
  }

  // 4. Shopping & E-Commerce & Retail
  if (
    keyword.includes("shoppe") || keyword.includes("shopee") || keyword.includes("shop") ||
    keyword.includes("shoping") || keyword.includes("shopping") || keyword.includes("tiki") ||
    keyword.includes("lazada") || keyword.includes("sendo") || keyword.includes("amazon") ||
    keyword.includes("tiktok") || keyword.includes("mua") || keyword.includes("sắm") ||
    keyword.includes("mall") || keyword.includes("boutique") || keyword.includes("clothes") ||
    keyword.includes("áo") || keyword.includes("quần") || keyword.includes("giày") ||
    keyword.includes("dép") || keyword.includes("túi") || keyword.includes("ví") ||
    keyword.includes("store") || keyword.includes("market") || keyword.includes("fashion") ||
    keyword.includes("mỹ phẩm") || keyword.includes("skincare") || keyword.includes("nước hoa")
  ) {
    return "Shopping";
  }

  // 5. Fuel & Transport
  if (
    keyword.includes("xe") || keyword.includes("bus") || keyword.includes("taxi") ||
    keyword.includes("grab") || keyword.includes("be") || keyword.includes("gojek") ||
    keyword.includes("xăng") || keyword.includes("gas") || keyword.includes("oil") ||
    keyword.includes("bãi xe") || keyword.includes("gửi xe") || keyword.includes("vé xe") ||
    keyword.includes("máy bay") || keyword.includes("flight") || keyword.includes("drive") ||
    keyword.includes("fuel") || keyword.includes("đổ xăng") || keyword.includes("rửa xe")
  ) {
    return "Fuel";
  }

  // 6. Housing & Utilities
  if (
    keyword.includes("nhà") || keyword.includes("điện") || keyword.includes("nước") ||
    keyword.includes("mạng") || keyword.includes("wifi") || keyword.includes("internet") ||
    keyword.includes("phòng") || keyword.includes("rent") || keyword.includes("house") ||
    keyword.includes("bill") || keyword.includes("chung cư") || keyword.includes("tiền nhà")
  ) {
    return "Housing";
  }

  // 7. Entertainment & Gaming
  if (
    keyword.includes("chơi") || keyword.includes("game") || keyword.includes("phim") ||
    keyword.includes("netflix") || keyword.includes("youtube") || keyword.includes("spotify") ||
    keyword.includes("movie") || keyword.includes("vé") || keyword.includes("cgv") ||
    keyword.includes("bida") || keyword.includes("karaoke") || keyword.includes("du lịch") ||
    keyword.includes("steam") || keyword.includes("nintendo") || keyword.includes("playstation")
  ) {
    return "Entertainment";
  }

  // 8. Salary & Income
  if (
    keyword.includes("lương") || keyword.includes("thưởng") || keyword.includes("salary") ||
    keyword.includes("bonus") || keyword.includes("paycheck") || keyword.includes("thu nhập")
  ) {
    return "Salary";
  }

  // 9. Bank & Transfer
  if (
    keyword.includes("bank") || keyword.includes("chuyển khoản") || keyword.includes("rút tiền") ||
    keyword.includes("vcb") || keyword.includes("tcb") || keyword.includes("mbbank") ||
    keyword.includes("tpbank") || keyword.includes("momo") || keyword.includes("zalopay")
  ) {
    return "Bank";
  }

  // 10. Investment
  if (
    keyword.includes("chứng khoán") || keyword.includes("coin") || keyword.includes("crypto") ||
    keyword.includes("lãi") || keyword.includes("tiết kiệm") || keyword.includes("invest")
  ) {
    return "Investment";
  }

  return "Others";
}

function useAutoCategory(title: string, hasManuallySelected: boolean) {
  const [isGuessing, setIsGuessing] = useState(false);
  const [guessedCategory, setGuessedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!title || title.trim().length < 2 || hasManuallySelected) {
      setGuessedCategory(null);
      return;
    }

    setIsGuessing(true);

    // 1. Synchronously set local smart guess for zero-latency response
    const localGuess = getSmartCategoryFromTitle(title);
    setGuessedCategory(localGuess);

    // 2. Debounced API fetch with fail-safe fallback
    const delayDebounce = setTimeout(async () => {
      try {
        const url = `http://localhost:8080/api/transactions/guess-category?title=${encodeURIComponent(title.trim())}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data && data.category) {
          setGuessedCategory(data.category);
        }
      } catch (e) {
        // Fallback already set by getSmartCategoryFromTitle
      } finally {
        setIsGuessing(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [title, hasManuallySelected]);

  return { isGuessing, guessedCategory };
}

function AddTransactionForm({
  wallets,
  onAdd,
}: {
  wallets: Wallet[];
  onAdd: (tx: Omit<Transaction, "id">, walletId: number) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "outcome">("outcome");
  const [category, setCategory] = useState("Others");
  const [walletId, setWalletId] = useState(wallets[0]?.id || 1);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [hasManuallySelected, setHasManuallySelected] = useState(false);

  const { isGuessing, guessedCategory } = useAutoCategory(name, hasManuallySelected);

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

  useEffect(() => {
    if (guessedCategory && !hasManuallySelected) {
      // Map to correct category list if necessary
      const matchedCat = categories.find(c => c.toLowerCase() === guessedCategory.toLowerCase()) || "Others";
      setCategory(matchedCat);
    }
  }, [guessedCategory, hasManuallySelected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;
    
    const finalAmount = type === "outcome" ? -numAmt : numAmt;
    const [year, month, day] = date.split("-");
    const formattedDate = `${day}-${month}-${year}`;

    onAdd({
      name,
      amount: finalAmount,
      category,
      date: formattedDate,
      walletId,
    }, walletId);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
      <div className="flex gap-2 p-1 rounded-xl bg-surf">
        <button
          type="button"
          onClick={() => setType("outcome")}
          className="flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer"
          style={{
            background: type === "outcome" ? C.red : "transparent",
            color: type === "outcome" ? C.white : C.tm,
          }}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className="flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer"
          style={{
            background: type === "income" ? C.green : "transparent",
            color: type === "income" ? C.bg : C.tm,
          }}
        >
          Income
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Description</label>
        <input
          type="text"
          required
          placeholder=""
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim() === "") {
              setHasManuallySelected(false);
            }
          }}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-tm font-medium">Category</label>
          {isGuessing && (
            <div className="flex items-center gap-1 text-[11px] text-gold font-medium animate-pulse">
              <Loader2 size={11} className="animate-spin text-gold" />
              <span>Gợi ý danh mục...</span>
            </div>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setHasManuallySelected(true);
            setCategory(e.target.value);
          }}
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
        <label className="text-xs text-tm font-medium">Pay With / Deposit To</label>
        <select
          value={walletId}
          onChange={(e) => setWalletId(Number(e.target.value))}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id} className="bg-sec">
              {w.label} (Bal: ${w.balance})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer"
        style={{ background: C.gold, color: C.bg }}
      >
        Save Transaction
      </button>
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
  const [accent, setAccent] = useState(C.purple);

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
  const [budgetVal, setBudgetVal] = useState(initialBudget === 0 ? "" : initialBudget.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = budgetVal.trim() === "" ? 0 : parseFloat(budgetVal);
    if (!isNaN(val) && val >= 0) {
      onSave(val);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white font-sans">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">Monthly Budget ($)</label>
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
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
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num > 0) {
          if (num === 1000 || num === 820) return 1000000;
          return num;
        }
      }
    } catch (e) {
      console.error("Error reading budget from localStorage", e);
    }
    return 1000000;
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Modal Visibility States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isEditWalletModalOpen, setIsEditWalletModalOpen] = useState(false);
  const [selectedWalletToEdit, setSelectedWalletToEdit] = useState<Wallet | null>(null);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedGoalToAction, setSelectedGoalToAction] = useState<SavingsGoal | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");

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
    localStorage.setItem("wealthy_v2_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_wallets", JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_savings_goals", JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_budget", budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_applied_tx_ids", JSON.stringify(appliedTxIds));
  }, [appliedTxIds]);

  // Reconcile unapplied transactions (e.g. Split Bill transactions) to active wallet balance
  useEffect(() => {
    if (wallets.length > 0 && transactions.length > 0) {
      const activeWallet = wallets[0];
      const unappliedTxs = transactions.filter((t) => !appliedTxIds.includes(t.id));

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
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // Handle username edit
  const handleEditName = () => {
    setIsProfileModalOpen(true);
  };

  const handleSaveSettings = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setGeminiApiKey(key);
    setIsSettingsModalOpen(false);
  };

  // Handle addition of a transaction
  const handleAddTransaction = (newTx: Omit<Transaction, "id">, walletId?: number) => {
    const validWallet = wallets.find((w) => w.id === (walletId || newTx.walletId)) || wallets[0];
    const targetWalletId = validWallet ? validWallet.id : (walletId || newTx.walletId || 1);

    const nextId = Math.max(0, ...transactions.map((t) => t.id)) + 1;
    const tx: Transaction = { ...newTx, walletId: targetWalletId, id: nextId };

    setTransactions((prev) => [tx, ...prev]);
    setAppliedTxIds((prev) => [...prev, nextId]);

    // Adjust the wallet balance
    setWallets((prev) => {
      if (prev.length === 0) {
        return [{ id: 1, label: "Main Wallet", balance: newTx.amount, accent: C.purple }];
      }
      return prev.map((w) =>
        w.id === targetWalletId ? { ...w, balance: w.balance + newTx.amount } : w
      );
    });

    setIsTxModalOpen(false);
  };

  // Handle deletion of a transaction (reverses wallet balance)
  const handleDeleteTransaction = (txId: number) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    // Reverse the amount from the wallet balance
    setWallets((prev) =>
      prev.map((w) =>
        (w.id === tx.walletId || (prev.length === 1 && w.id === prev[0].id))
          ? { ...w, balance: w.balance - tx.amount }
          : w
      )
    );
  };

  // Handle addition of a wallet
  const handleAddWallet = (newWallet: Omit<Wallet, "id">) => {
    const nextId = Math.max(0, ...wallets.map((w) => w.id)) + 1;
    const wallet: Wallet = { ...newWallet, id: nextId };

    setWallets((prev) => [...prev, wallet]);
    setIsWalletModalOpen(false);
  };

  // Handle wallet edits, saves, and deletes
  const handleEditWalletClick = (wallet: Wallet) => {
    setSelectedWalletToEdit(wallet);
    setIsEditWalletModalOpen(true);
  };

  const handleSaveWallet = (updatedWallet: Wallet) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w))
    );
    setIsEditWalletModalOpen(false);
    setSelectedWalletToEdit(null);
  };

  const handleDeleteWallet = (walletId: number) => {
    setWallets((prev) => prev.filter((w) => w.id !== walletId));
    setIsEditWalletModalOpen(false);
    setSelectedWalletToEdit(null);
  };

  // Handle savings goals actions (add, deposit, withdraw, delete, confetti)
  const handleAddGoal = (newGoal: Omit<SavingsGoal, "id" | "status">) => {
    const nextId = Math.max(0, ...savingsGoals.map((g) => g.id)) + 1;
    const goal: SavingsGoal = {
      ...newGoal,
      id: nextId,
      status: newGoal.currentAmount >= newGoal.targetAmount ? "COMPLETED" : "IN_PROGRESS",
    };

    setSavingsGoals((prev) => [...prev, goal]);
    setIsAddGoalModalOpen(false);

    if (goal.status === "COMPLETED") {
      triggerConfetti();
    }
  };

  const handleDepositToGoal = (goalId: number, amount: number) => {
    if (amount <= 0) return;
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newAmt = Math.round((g.currentAmount + amount) * 100) / 100;
        const isNowCompleted = newAmt >= g.targetAmount;

        if (isNowCompleted && g.status !== "COMPLETED") {
          triggerConfetti();
        }

        return {
          ...g,
          currentAmount: newAmt,
          status: isNowCompleted ? "COMPLETED" : "IN_PROGRESS",
        };
      })
    );
  };

  const handleWithdrawFromGoal = (goalId: number, amount: number) => {
    if (amount <= 0) return;
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newAmt = Math.max(0, Math.round((g.currentAmount - amount) * 100) / 100);
        return {
          ...g,
          currentAmount: newAmt,
          status: newAmt >= g.targetAmount ? "COMPLETED" : "IN_PROGRESS",
        };
      })
    );
  };

  const handleDeleteGoal = (goalId: number) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== goalId));
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

  const screens = [
    <HomeScreen
      wallets={wallets}
      transactions={filteredTransactions}
      budget={budget}
      onEditBudgetClick={() => setIsBudgetModalOpen(true)}
      onAddTransactionClick={() => setIsTxModalOpen(true)}
      onAddWalletClick={() => setIsWalletModalOpen(true)}
      userName={userName}
      onEditName={handleEditName}
      onEditWalletClick={handleEditWalletClick}
      onDeleteTransaction={handleDeleteTransaction}
    />,
    <StatisticsScreen
      transactions={transactions}
      budget={budget}
      savingsGoals={savingsGoals}
      availableBalance={availableBalance}
      totalBalance={totalBalance}
      onAddGoalClick={() => setIsAddGoalModalOpen(true)}
      onDeposit={handleDepositToGoal}
      onWithdraw={handleWithdrawFromGoal}
      onDeleteGoal={handleDeleteGoal}
    />,
    <SplitScreen userName={userName} onAddTransaction={handleAddTransaction} />,
  ];

  return (
    <>
      <style>{`
        :root { color-scheme: dark; }
        body { background: #080809; margin: 0; }
        .hide-scroll { scrollbar-width: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        /* Smooth scrolling for main area */
        .desktop-content { scroll-behavior: smooth; }
      `}</style>

      <div className="flex h-[100dvh] w-full bg-[#0A0A0A] text-white overflow-hidden relative">
        {/* Desktop Sidebar */}
        <Sidebar active={activeTab} onChange={setActiveTab} userName={userName} onEditName={handleEditName} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full md:pl-64 overflow-y-auto w-full pb-20 md:pb-0 hide-scroll">
          {/* Header */}
          <header
            className="sticky top-0 z-40 w-full px-4 md:px-8 py-3.5 md:py-5 flex items-center justify-between border-b border-white/10 transition-all duration-300"
            style={{
              background: "rgba(18, 18, 18, 0.85)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div>
                <div className="hidden sm:flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: C.gold + "1a",
                      color: C.gold,
                      border: `1px solid ${C.gold}33`,
                    }}
                  >
                    PRO DASHBOARD
                  </span>
                  <span className="text-[11px] md:text-[12px] hidden md:inline" style={{ color: C.tm }}>
                    • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h2
                  className="text-base md:text-2xl font-bold cursor-pointer hover:text-gold transition-colors flex items-center gap-1.5 truncate text-white"
                  onClick={handleEditName}
                >
                  <span className="truncate">{t("dashboard.welcome")}, {userName || "User"}</span> 👋
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Search input - hidden on mobile, shown on desktop */}
              <div className="hidden md:block relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-gold"
                  size={16}
                  color={C.tm}
                />
                <input
                  type="text"
                  placeholder={t("dashboard.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 rounded-2xl w-56 lg:w-64 text-sm transition-all duration-300 focus:w-72 outline-none border font-sans"
                  style={{
                    background: C.card,
                    borderColor: C.border,
                    color: C.white,
                  }}
                />
              </div>

              {/* New Transaction Button */}
              <motion.button
                className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                style={{
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
                  color: C.bg,
                  boxShadow: `0 4px 16px ${C.gold}33`,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsTxModalOpen(true)}
                title={t("dashboard.newTransaction")}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">{t("dashboard.newTransaction")}</span>
              </motion.button>

              {/* Currency & Language Toggles */}
              <CurrencyToggle />
              <LanguageToggle />
            </div>
          </header>

          {/* Screen Content */}
          <div className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-[1400px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {screens[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Add Transaction Drawer (Vaul iOS-style Bottom Sheet) */}
      <Drawer.Root open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[32px] border-t outline-none font-sans max-h-[90vh]" style={{ background: C.card, borderColor: C.border }}>
            {/* Drag Handle */}
            <div className="mx-auto w-12 h-1.5 rounded-full my-3 bg-white/20" />
            
            {/* Content Container */}
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Drawer.Title className="text-[18px] font-bold text-white">New Transaction</Drawer.Title>
                <Drawer.Description className="sr-only">Add a new expense or income transaction</Drawer.Description>
                <button
                  onClick={() => setIsTxModalOpen(false)}
                  className="text-[13px] font-medium text-tm hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
              <AddTransactionForm wallets={wallets} onAdd={handleAddTransaction} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Add Wallet Modal */}
      <Modal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} title="New Wallet">
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
          onSave={(newBudget) => {
            setBudget(newBudget);
            setIsBudgetModalOpen(false);
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
              className="relative w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center"
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


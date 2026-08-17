import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart2,
  Calendar,
  Download,
  Search,
  PiggyBank,
  Plus,
  Trash2,
  Trophy,
  Target,
  CreditCard,
  House,
  Car,
  TrendingUp,
  ShoppingBag,
  PieChart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  C,
  Card,
  ProgressBar,
  Modal,
  categoryColors,
  categoryIcons,
  parseDateInfo,
} from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import CashFlowCalendar from "./CashFlowCalendar";
import type { Wallet, Transaction, SavingsGoal } from "../../App";

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

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonthIndexFromDate = (dateStr: string): number => {
  return parseDateInfo(dateStr).month;
};

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


export default function StatisticsScreen({
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
      <div className="px-5 md:px-0 pb-4">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {[
            { id: 0, label: t("stats.tabStats", "Thống kê"), icon: BarChart2 },
            { id: 1, label: t("stats.tabCashFlow", "Lịch dòng tiền"), icon: Calendar },
            { id: 2, label: t("stats.tabSavings", "Hũ tiết kiệm"), icon: PiggyBank },
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
                <span className="truncate">{tab.label}</span>
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

function getGoalColorOptions() {
  return [
    { label: "Gold", value: C.gold },
    { label: "Purple", value: C.purple },
    { label: "Green", value: C.green },
    { label: "Red", value: C.red },
    { label: "Blue", value: "#3B82F6" },
    { label: "Pink", value: "#EC4899" },
  ];
}

function resolveGoalIcon(iconKey: string) {
  return goalIconOptions.find((o) => o.key === iconKey)?.Icon || PiggyBank;
}

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
  const { currency, exchangeRate, formatCurrency } = useCurrency();
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
    const rawNum = parseFloat(amount);
    if (isNaN(rawNum) || rawNum <= 0) return;
    const num = currency === "USD" ? Math.round(rawNum * exchangeRate) : Math.round(rawNum);
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
          {formatCurrency(mode === "deposit" ? (availableBalance || 0) : currentAmount)}
        </span>
      </div>

      {/* Amount Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: C.surf, border: `1px solid ${C.border}` }}
      >
        <span className="text-[18px] font-bold" style={{ color: C.tm }}>{currency === "USD" ? "$" : "₫"}</span>
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

      {/* Warning if amount exceeds available balance */}
      {amount && currency === "USD" && parseFloat(amount) * exchangeRate > (mode === "deposit" ? availableBalance : currentAmount) && (
        <p className="text-[12px]" style={{ color: C.red }}>
          ⚠ Không đủ {mode === "deposit" ? "số dư khả dụng" : "số dư trong hũ"}
        </p>
      )}
      {amount && currency === "VND" && parseFloat(amount) > (mode === "deposit" ? availableBalance : currentAmount) && (
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

export function AddGoalModal({
  onAdd,
}: {
  onAdd: (goal: Omit<SavingsGoal, "id" | "status">) => void;
}) {
  const { currency, exchangeRate } = useCurrency();
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("PiggyBank");
  const [selectedColor, setSelectedColor] = useState<string>(C.gold);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    const rawNum = parseFloat(targetAmount);
    if (isNaN(rawNum) || rawNum <= 0) return;
    const num = currency === "USD" ? Math.round(rawNum * exchangeRate) : Math.round(rawNum);
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
          {getGoalColorOptions().map(({ label, value }) => (
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
        <label className="text-[12px] font-semibold" style={{ color: C.tm }}>SỐ TIỀN MỤC TIÊU ({currency})</label>
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: C.surf, border: `1px solid ${C.border}` }}
        >
          <span style={{ color: C.tm }}>{currency === "USD" ? "$" : "₫"}</span>
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
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Car, CreditCard, House, PiggyBank, Plus, ShoppingBag, Target, Trash2, TrendingUp, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/common/Card";
import { Modal } from "../../components/common/Modal";
import { useCurrency } from "../../context/CurrencyContext";
import { C } from "../../design/tokens";
import type { SavingsGoal } from "../../types/finance";

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
export function AddGoalModal({
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

export function SavingsGoalsScreen({
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



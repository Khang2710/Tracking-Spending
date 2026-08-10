import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCircle2, ChevronRight, X, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { C, Card } from "../../App";
import { NudgeButton } from "../../components/common/NudgeButton";
import { useCurrency } from "../../context/CurrencyContext";

interface TransactionRecord {
  date: string;
  description: string;
  amount: number;
  isLent: boolean; // true = they owe me, false = I owe them
  isSettled?: boolean;
}

interface FriendBalanceItem {
  id: number;
  name: string;
  balance: number;
  history: TransactionRecord[];
}

interface DebtBalancesProps {
  balances: FriendBalanceItem[];
  setBalances: React.Dispatch<React.SetStateAction<FriendBalanceItem[]>>;
  onRemoveFriend: (name: string) => void;
  onSettleTransaction: (friendName: string, transactionId: string) => void;
}

export default function DebtBalances({
  balances,
  setBalances,
  onRemoveFriend,
  onSettleTransaction,
}: DebtBalancesProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedFriend, setSelectedFriend] = useState<FriendBalanceItem | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const handleOpenDetail = (friend: FriendBalanceItem) => {
    setSelectedFriend(friend);
    setIsSuccess(false);
    setIsSettling(false);
  };

  const handleSettleUp = () => {
    if (!selectedFriend) return;
    setIsSettling(true);

    setTimeout(() => {
      setIsSettling(false);
      setIsSuccess(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

      setTimeout(() => {
        setBalances((prev) =>
          prev.map((item) =>
            (item?.name || "").normalize("NFC").trim().toLowerCase() === (selectedFriend?.name || "").normalize("NFC").trim().toLowerCase()
              ? {
                  ...item,
                  balance: 0,
                  history: (item.history || []).map((h) => ({ ...h, isSettled: true })),
                }
              : item
          )
        );
        setSelectedFriend(null);
        setIsSuccess(false);
      }, 1000);
    }, 1500);
  };

  const activeFriendData = selectedFriend
    ? balances.find((b) => (b?.name || "").normalize("NFC").trim().toLowerCase() === (selectedFriend?.name || "").normalize("NFC").trim().toLowerCase()) || selectedFriend
    : null;

  return (
    <div className="px-5 md:px-0 max-w-2xl w-full mx-auto pb-10">
      <DebtList balances={balances} onSelectFriend={handleOpenDetail} />

      {/* Detail Modal */}
      <AnimatePresence>
        {activeFriendData && (
          <DebtDetailModal
            friend={activeFriendData}
            isSettling={isSettling}
            isSuccess={isSuccess}
            onClose={() => {
              if (!isSettling && !isSuccess) setSelectedFriend(null);
            }}
            onSettle={handleSettleUp}
            onSettleTransaction={onSettleTransaction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── DEBT LIST COMPONENT ──────────────────────────────────────────────────────
interface DebtListProps {
  balances: FriendBalanceItem[];
  onSelectFriend: (friend: FriendBalanceItem) => void;
}

function DebtList({ balances, onSelectFriend }: DebtListProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden font-sans border border-solid" style={{ borderColor: C.border }}>
      <div className="p-4 border-b border-solid flex items-center justify-between" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-tm">{t("debt.runningBalances")}</h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.purple + "22", color: C.purple }}>
          {t("debt.aiNudgeEnabled")}
        </span>
      </div>
      <div className="flex flex-col">
        {balances.length === 0 ? (
          <div className="p-8 text-center text-sm text-tm flex flex-col items-center gap-2">
            <RefreshCw size={24} className="opacity-50 animate-spin-slow" />
            {t("debt.noBalances")}
            <span className="text-xs opacity-60">{t("debt.addFriendHint")}</span>
          </div>
        ) : (
          balances.map((item) => {
            const isLent = item.balance > 0;
            const isSettled = item.balance === 0;
            const absBalance = Math.abs(item.balance);

            return (
              <motion.div
                key={item.id}
                onClick={() => onSelectFriend(item)}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-5 py-4 border-b border-solid last:border-b-0 transition-colors hover:bg-surf/30 cursor-pointer"
                style={{ borderColor: C.border }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    background: isSettled
                      ? C.surf
                      : isLent
                      ? `linear-gradient(135deg, ${C.green}18 0%, ${C.green}0c 100%)`
                      : `linear-gradient(135deg, ${C.red}18 0%, ${C.red}0c 100%)`,
                    border: `1px solid ${isSettled ? C.border : isLent ? C.green + "40" : C.red + "40"}`,
                    color: isSettled ? C.tm : isLent ? C.green : C.red,
                  }}
                >
                  {getInitials(item.name)}
                </div>

                {/* Name & Subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{item.name}</p>
                  <p className="text-xs text-tm mt-0.5">
                    {isSettled ? t("debt.allSettled") : isLent ? t("debt.youLent") : t("debt.owesYou")}
                  </p>
                </div>

                {/* AI Nudge Button for active debts */}
                {!isSettled && (
                  <div className="cursor-default" onClick={(e) => e.stopPropagation()}>
                    <NudgeButton
                      debtorName={item.name}
                      amount={absBalance}
                    />
                  </div>
                )}

                {/* Amount and status */}
                <div className="text-right">
                  <p
                    className={`text-[15px] font-bold ${
                      isSettled ? "text-tm" : isLent ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isSettled ? "" : formatCurrency(item.balance)}
                  </p>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${
                      isSettled
                        ? "bg-surf text-tm"
                        : isLent
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {isSettled ? t("debt.settled") : isLent ? t("debt.lent") : t("debt.owed")}
                  </span>
                </div>

                <ChevronRight size={16} color={C.tm} />
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─── DEBT DETAIL & SETTLE UP MODAL ────────────────────────────────────────────
interface DebtDetailModalProps {
  friend: FriendBalanceItem;
  isSettling: boolean;
  isSuccess: boolean;
  onClose: () => void;
  onSettle: () => void;
  onSettleTransaction: (friendName: string, transactionId: string) => void;
}

function DebtDetailModal({
  friend,
  isSettling,
  isSuccess,
  onClose,
  onSettle,
  onSettleTransaction,
}: DebtDetailModalProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const isLent = friend.balance > 0;
  const isSettled = friend.balance === 0;
  const absBalance = Math.abs(friend.balance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[#000000aa] backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal Dialog Body */}
      <motion.div
        className="relative w-full max-w-md rounded-3xl border border-solid shadow-2xl overflow-hidden font-sans"
        style={{ background: C.card, borderColor: C.border }}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-solid" style={{ borderColor: C.border }}>
          <h3 className="font-bold text-white text-[16px]">{t("debt.detailTitle")}</h3>
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.98 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surf cursor-pointer border-0 bg-transparent"
          >
            <X size={16} color={C.tm} />
          </motion.button>
        </div>

        {/* Dynamic Success State Animation Overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
              style={{ background: C.card }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
                className="mb-4"
              >
                <CheckCircle2 size={64} className="text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-1">{t("debt.settled")}</h2>
              <p className="text-sm text-tm">{t("debt.allSettled")}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Top summary row */}
          <div className="text-center py-4 rounded-2xl" style={{ background: C.surf + "30" }}>
            <p className="text-xs text-tm uppercase font-bold tracking-wider mb-2">{t("debt.netBalanceWith")} {friend.name}</p>
            <h2
              className={`text-3xl font-extrabold tracking-tight ${
                isSettled ? "text-white" : isLent ? "text-green-500" : "text-red-500"
              }`}
            >
              {isSettled ? "" : formatCurrency(friend.balance)}
            </h2>
            <p className="text-xs text-tm mt-2">
              {isSettled
                ? t("debt.noActiveBalance")
                : isLent
                ? `${friend.name} ${t("debt.owesYouAmount")}`
                : `${t("debt.youOweAmount")} ${friend.name}`}
            </p>
          </div>

          {/* Timeline History */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[11px] text-tm uppercase font-bold tracking-wider mb-2">{t("debt.historyTitle")}</h4>
            {friend.history.length === 0 ? (
              <p className="text-xs italic text-tm opacity-60 text-center py-4">{t("debt.noHistory")}</p>
            ) : (
              <div className="flex flex-col gap-4 pl-1">
                {friend.history.map((record, idx) => (
                  <div key={idx} className="flex gap-3 text-sm items-start relative">
                    {/* Timeline line connection */}
                    {idx < friend.history.length - 1 && (
                      <div className="absolute left-[9px] top-[18px] bottom-[-22px] w-0.5 bg-surf" />
                    )}

                    {/* Timeline dot icon */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: record.isLent ? C.green + "20" : C.red + "20",
                        border: `1.5px solid ${record.isLent ? C.green + "40" : C.red + "40"}`,
                      }}
                    >
                      {record.isLent ? (
                        <ArrowUpRight size={10} className="text-green-400" />
                      ) : (
                        <ArrowDownRight size={10} className="text-red-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-semibold text-white text-[13px] truncate">{record.description}</span>
                        <span className={`font-bold text-[13px] ${record.isLent ? "text-green-400" : "text-red-400"}`}>
                          {record.isLent ? "+" : "-"}{formatCurrency(record.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] text-tm">{record.date}</span>
                        {record.isSettled ? (
                          <span className="text-[10px] text-tm uppercase font-bold">{t("debt.settled")}</span>
                        ) : (
                          <motion.button
                            type="button"
                            onClick={() => onSettleTransaction(friend.name, record.id)}
                            whileTap={{ scale: 0.98 }}
                            className="text-[10px] text-gold font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                          >
                            {t("debt.settledBtn")}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settle Up Action Button */}
          {!isSettled && (
            <motion.button
              type="button"
              onClick={onSettle}
              disabled={isSettling}
              className="w-full py-3.5 rounded-2xl font-bold text-sm cursor-pointer transition-all hover:brightness-110 border-0 shadow-lg flex items-center justify-center gap-2"
              style={{ background: C.gold, color: C.bg }}
              whileTap={{ scale: 0.98 }}
            >
              {isSettling ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {t("debt.processing")}
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  {t("debt.settleUpBtn")}
                </>
              )}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C } from "../../App";
import AssignBill from "./AssignBill";
import DebtBalances from "./DebtBalances";
import BillHistory from "./BillHistory";

export interface SavedBill {
  id: string;
  title: string;
  date: string;
  items: { name: string; price: number; consumers: string[] }[];
  taxPercent: number;
  tip: number;
  payer: string;
  debts: { name: string; total: number }[];
  grandTotal: number;
}

export interface TransactionRecord {
  id?: string | number;
  date: string;
  description: string;
  amount: number;
  isLent: boolean;
  isSettled?: boolean;
}

export interface FriendBalanceItem {
  id: number;
  name: string;
  balance: number;
  history: TransactionRecord[];
}

import { Transaction } from "../../App";

export default function SplitScreen({
  userName,
  onAddTransaction,
}: {
  userName: string;
  onAddTransaction?: (tx: Omit<Transaction, "id">, walletId?: number) => void;
}) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<"calculator" | "history" | "balances">("calculator");

  // Shared state: bills list
  const [bills, setBills] = useState<SavedBill[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_split_bills");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error reading split bills", e);
    }
    return [];
  });

  const [friends, setFriends] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_split_friends");
      const parsed: any = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      const unique = new Set<string>();
      parsed.forEach(f => {
        if (typeof f === "string" && f.trim()) {
          unique.add(f.normalize("NFC").trim());
        }
      });
      return Array.from(unique);
    } catch (e) {
      console.error("Error reading split friends", e);
      return [];
    }
  });

  const [balances, setBalances] = useState<FriendBalanceItem[]>(() => {
    try {
      const saved = localStorage.getItem("wealthy_v2_split_balances");
      const parsed: any = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];

      const map = new Map<string, FriendBalanceItem>();
      parsed.forEach((item: any) => {
        if (!item || !item.name || typeof item.name !== "string") return;
        const cleanName = item.name.normalize("NFC").trim();
        const key = cleanName.toLowerCase();
        const bal = typeof item.balance === "number" ? item.balance : Number(item.balance) || 0;
        const rawHistory = Array.isArray(item.history) ? item.history : [];

        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.balance = Math.round((existing.balance + bal) * 100) / 100;

          const mergedHistory = [...(existing.history || []), ...rawHistory];
          const uniqueTxMap = new Map<string, any>();
          mergedHistory.forEach((h: any) => {
            if (!h) return;
            const txId = h.id || ((h.description || "") + "-" + (h.amount || 0) + "-" + (h.date || ""));
            if (!uniqueTxMap.has(txId)) {
              uniqueTxMap.set(txId, {
                ...h,
                id: h.id || txId,
                isSettled: h.isSettled !== undefined ? h.isSettled : false,
              });
            }
          });
          existing.history = Array.from(uniqueTxMap.values());
        } else {
          map.set(key, {
            ...item,
            id: item.id || Date.now(),
            name: cleanName,
            balance: bal,
            history: rawHistory.map((h: any) => ({
              ...h,
              id: h?.id || ((h?.description || "") + "-" + (h?.amount || 0) + "-" + (h?.date || "")),
              isSettled: h?.isSettled !== undefined ? h.isSettled : false,
            })),
          });
        }
      });
      return Array.from(map.values());
    } catch (e) {
      console.error("Error reading split balances", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("wealthy_v2_split_friends", JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_split_balances", JSON.stringify(balances));
  }, [balances]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_split_bills", JSON.stringify(bills));
  }, [bills]);

  const handleAddFriend = (name: string) => {
    const cleanName = name.normalize("NFC").trim();
    if (!cleanName) return;
    const exists = friends.some(f => f.normalize("NFC").trim().toLowerCase() === cleanName.toLowerCase());
    if (exists) return;

    setFriends((prev) => [...prev, cleanName]);
    setBalances((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: cleanName,
        balance: 0.0,
        history: [],
      },
    ]);
  };

  const handleRemoveFriend = (name: string) => {
    const normName = name.normalize("NFC").trim().toLowerCase();
    setFriends((prev) => prev.filter((f) => f.normalize("NFC").trim().toLowerCase() !== normName));
    setBalances((prev) => prev.filter((b) => b.name.normalize("NFC").trim().toLowerCase() !== normName));
  };

  const handleSettleTransaction = (friendName: string, transactionId: string) => {
    const normFriend = friendName.normalize("NFC").trim().toLowerCase();
    setBalances((prev) =>
      prev.map((fb) => {
        if (fb.name.normalize("NFC").trim().toLowerCase() !== normFriend) return fb;

        let balanceAdjust = 0;
        const updatedHistory = fb.history.map((tx) => {
          if (tx.id === transactionId && !tx.isSettled) {
            balanceAdjust = tx.isLent ? -tx.amount : tx.amount;
            return { ...tx, isSettled: true };
          }
          return tx;
        });

        const rawNewBalance = fb.balance + balanceAdjust;
        const roundedNewBalance = Math.round(rawNewBalance * 100) / 100;

        return {
          ...fb,
          balance: roundedNewBalance,
          history: updatedHistory,
        };
      })
    );
  };

  const handleDeleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Unified Screen Header */}
      <div className="px-5 md:px-0 pt-12 md:pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[28px] font-bold text-white tracking-tight flex items-center gap-2 font-sans">
            <Users color={C.gold} size={26} /> {t("split.headerTitle")}
          </h1>
          <p className="text-sm text-tm font-sans">
            {t("split.headerSubtitle")}
          </p>
        </div>
      </div>

      {/* Segmented Switcher (Centered Segment Control) */}
      <div className="px-5 md:px-0 flex justify-center mb-2 font-sans">
        <div
          className="flex p-1 rounded-2xl border w-full max-w-lg relative"
          style={{ background: C.sec, borderColor: C.border }}
        >
          <button
            onClick={() => setSubTab("calculator")}
            className="flex-1 py-3 text-xs font-bold rounded-xl relative transition-colors cursor-pointer border-0 bg-transparent"
            style={{ color: subTab === "calculator" ? C.bg : C.tm }}
          >
            {subTab === "calculator" && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 rounded-xl"
                style={{ background: C.gold }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              />
            )}
            <span className="relative z-10">{t("split.tabCalculator")}</span>
          </button>
          <button
            onClick={() => setSubTab("history")}
            className="flex-1 py-3 text-xs font-bold rounded-xl relative transition-colors cursor-pointer border-0 bg-transparent"
            style={{ color: subTab === "history" ? C.bg : C.tm }}
          >
            {subTab === "history" && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 rounded-xl"
                style={{ background: C.gold }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              />
            )}
            <span className="relative z-10">{t("split.tabHistory")}</span>
          </button>
          <button
            onClick={() => setSubTab("balances")}
            className="flex-1 py-3 text-xs font-bold rounded-xl relative transition-colors cursor-pointer border-0 bg-transparent"
            style={{ color: subTab === "balances" ? C.bg : C.tm }}
          >
            {subTab === "balances" && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 rounded-xl"
                style={{ background: C.gold }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              />
            )}
            <span className="relative z-10">{t("split.tabBalances")}</span>
          </button>
        </div>
      </div>

      {/* Render Sub Tab */}
      <div className="flex-1">
        <div style={{ display: subTab === "calculator" ? "block" : "none" }}>
          <AssignBill
            friends={friends}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            balances={balances}
            setBalances={setBalances}
            userName={userName}
            setBills={setBills}
            onAddTransaction={onAddTransaction}
          />
        </div>
        <div style={{ display: subTab === "history" ? "block" : "none" }}>
          <BillHistory
            bills={bills}
            onDeleteBill={handleDeleteBill}
            userName={userName}
          />
        </div>
        <div style={{ display: subTab === "balances" ? "block" : "none" }}>
          <DebtBalances
            balances={balances}
            setBalances={setBalances}
            onRemoveFriend={handleRemoveFriend}
            onSettleTransaction={handleSettleTransaction}
          />
        </div>
      </div>
    </div>
  );
}

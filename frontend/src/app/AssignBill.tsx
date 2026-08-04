import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, Receipt, Sparkles, Check, Trash2, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C, Card } from "./App";

interface SplitItem {
  id: number;
  name: string;
  price: number;
  consumers: string[];
}

import { FriendBalanceItem, SavedBill } from "./SplitScreen";
import { Transaction } from "./App";

interface AssignBillProps {
  friends: string[];
  onAddFriend: (name: string) => void;
  onRemoveFriend: (name: string) => void;
  balances: FriendBalanceItem[];
  setBalances: React.Dispatch<React.SetStateAction<FriendBalanceItem[]>>;
  userName: string;
  setBills: React.Dispatch<React.SetStateAction<SavedBill[]>>;
  onAddTransaction?: (tx: Omit<Transaction, "id">, walletId?: number) => void;
}

export default function AssignBill({
  friends,
  onAddFriend,
  onRemoveFriend,
  balances,
  setBalances,
  userName,
  setBills,
  onAddTransaction,
}: AssignBillProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SplitItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [taxPercent, setTaxPercent] = useState<number>(10);
  const [tip, setTip] = useState<number>(15);

  const [newFriendName, setNewFriendName] = useState("");
  const [rawReceipt, setRawReceipt] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [billTitle, setBillTitle] = useState("");

  const myName = userName || t("common.you");
  const [payer, setPayer] = useState("");
  const activePayer = payer || myName;

  const handleExtractAI = () => {
    if (!rawReceipt.trim()) return;
    setIsExtracting(true);

    setTimeout(() => {
      const lines = rawReceipt.split("\n");
      const parsedItems: SplitItem[] = [];
      let nextId = items.length + 1;

      lines.forEach((line) => {
        const match = line.match(/(.*?)\$?(\d+(?:\.\d{1,2})?)\s*$/);
        if (match) {
          const name = match[1].trim().replace(/^[\d\s.\-*]+/, "");
          const price = parseFloat(match[2]);
          if (name && !isNaN(price)) {
            parsedItems.push({
              id: nextId++,
              name,
              price,
              consumers: [],
            });
          }
        }
      });

      if (parsedItems.length > 0) {
        setItems((prev) => [...prev, ...parsedItems]);
        setRawReceipt("");
      }
      setIsExtracting(false);
    }, 1500);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return;

    const nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    setItems((prev) => [
      ...prev,
      { id: nextId, name: newItemName.trim(), price, consumers: [] },
    ]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFriendName.trim();
    if (!name || friends.includes(name)) return;
    onAddFriend(name);
    setNewFriendName("");
  };

  const handleRemoveFriend = (name: string) => {
    onRemoveFriend(name);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        consumers: item.consumers.filter((c) => c !== name),
      }))
    );
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleToggleConsumer = (friendName: string) => {
    if (selectedItemId === null) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItemId) return item;
        const exists = item.consumers.includes(friendName);
        return {
          ...item,
          consumers: exists
            ? item.consumers.filter((c) => c !== friendName)
            : [...item.consumers, friendName],
        };
      })
    );
  };

  const allParticipants = [myName, ...friends];
  const numPeople = allParticipants.length;
  const itemShares: Record<string, number> = {};
  allParticipants.forEach((p) => {
    itemShares[p] = 0;
  });

  items.forEach((item) => {
    if (item.consumers.length === 0) return;
    const pricePerPerson = item.price / item.consumers.length;
    item.consumers.forEach((c) => {
      if (itemShares[c] !== undefined) {
        itemShares[c] += pricePerPerson;
      }
    });
  });

  const tipShare = numPeople > 0 ? tip / numPeople : 0;
  const debts = allParticipants.map((p) => {
    const personalItemCost = itemShares[p] || 0;
    const personalTax = personalItemCost * (taxPercent / 100);
    const totalDue = personalItemCost + personalTax + tipShare;
    return {
      name: p,
      itemCost: personalItemCost,
      tax: personalTax,
      total: Math.round(totalDue * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const totalTax = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + totalTax + tip;

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };

  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSaveAndSplit = () => {
    if (items.length === 0) return;
    const finalTitle = billTitle.trim() || `Bill Split: ${items.length} items`;
    
    setBalances((prev) => {
      const existingNames = new Set(prev.map((x) => x.name.normalize("NFC").trim().toLowerCase()));
      
      let updatedBalances = [...prev];
      friends.forEach((f) => {
        const normF = f.normalize("NFC").trim();
        if (!existingNames.has(normF.toLowerCase())) {
          updatedBalances.push({
            id: Date.now() + Math.random(),
            name: normF,
            balance: 0,
            history: [],
          });
        }
      });

      return updatedBalances.map((fb) => {
        const fbNormName = fb.name.normalize("NFC").trim().toLowerCase();
        const d = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === fbNormName);
        if (!d) return fb;

        let diff = 0;
        let desc = "";
        let isLent = false;

        const activePayerNorm = activePayer.normalize("NFC").trim().toLowerCase();
        const myNameNorm = myName.normalize("NFC").trim().toLowerCase();

        if (activePayerNorm === myNameNorm) {
          diff = d.total;
          desc = `${finalTitle} (You paid)`;
          isLent = true;
        } else if (activePayerNorm === fbNormName) {
          const myShare = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm)?.total || 0;
          diff = -myShare;
          desc = `${finalTitle} (${fb.name} paid)`;
          isLent = false;
        } else {
          return fb;
        }

        if (diff === 0) return fb;

        const newRecord = {
          id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
          date: "Today",
          description: desc,
          amount: Math.abs(diff),
          isLent,
          isSettled: false,
        };

        return {
          ...fb,
          balance: Math.round((fb.balance + diff) * 100) / 100,
          history: [newRecord, ...fb.history],
        };
      });
    });

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formattedDate = `Today • ${nowTime}`;

    const newSavedBill = {
      id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9),
      title: finalTitle,
      date: formattedDate,
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        consumers: i.consumers,
      })),
      taxPercent,
      tip,
      payer: activePayer,
      debts: debts.map((d) => ({
        name: d.name,
        total: d.total,
      })),
      grandTotal,
    };

    setBills((prev) => [newSavedBill, ...prev]);

    // ─── Auto-generate personal transaction for Current User ───
    const myNameNorm = myName.normalize("NFC").trim().toLowerCase();
    const myDebt = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm);
    const currentUserShare = myDebt ? myDebt.total : 0;

    if (currentUserShare > 0 && onAddTransaction) {
      onAddTransaction(
        {
          name: `Chia bill: ${finalTitle}`,
          amount: -currentUserShare,
          category: "Food",
          date: formattedDate,
          walletId: 1,
        }
      );
    }

    setShowSuccessToast(true);
    setItems([]);
    setBillTitle("");
    setSelectedItemId(null);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <>
      <div className="px-5 md:px-0 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-10">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="p-4 md:p-6">
            <h3 className="text-[16px] font-semibold text-white mb-3 flex items-center gap-2 font-sans">
              <Sparkles size={16} color={C.gold} /> {t("split.ocrTitle")}
            </h3>
            <p className="text-xs text-tm mb-4 font-sans leading-relaxed">
              {t("split.ocrHint")}
            </p>
            <textarea
              rows={4}
              placeholder={t("split.ocrPlaceholder")}
              value={rawReceipt}
              onChange={(e) => setRawReceipt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold resize-none"
              style={{ borderColor: C.border }}
            />
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleExtractAI}
                disabled={isExtracting || !rawReceipt.trim()}
                className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                style={{ background: C.gold, color: C.bg }}
              >
                {isExtracting ? (
                  <span className="w-4 h-4 border-2 border-solid rounded-full animate-spin border-bg border-t-transparent" style={{ borderColor: C.bg }} />
                ) : (
                  <>
                    <Receipt size={14} /> {t("split.ocrBtn")}
                  </>
                )}
              </button>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white font-sans">{t("split.selectFoodTitle")}</h3>
              <span className="text-xs text-tm font-sans">{t("split.selectFoodSubtitle")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.length === 0 ? (
                <div
                  className="sm:col-span-2 flex flex-col items-center justify-center p-8 text-center text-sm rounded-2xl border"
                  style={{ color: C.tm, background: C.card, borderColor: C.border }}
                >
                  <Receipt size={32} color={C.tm} className="opacity-50 mb-3" />
                  {t("split.noItems")}
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="cursor-pointer relative overflow-hidden"
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      <Card
                        className="p-4 transition-all h-full flex flex-col justify-between"
                        style={{
                          borderColor: isSelected ? C.gold : C.border,
                          boxShadow: isSelected ? `0 0 12px ${C.gold}1a` : "none",
                          background: isSelected ? C.surf + "bb" : C.card,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4 font-sans">
                          <div className="min-w-0">
                            <h4 className="font-bold text-[15px] text-white truncate">{item.name}</h4>
                            <p className="text-xs text-tm mt-0.5" style={{ color: C.gold }}>
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10 cursor-pointer border-0 bg-transparent"
                          >
                            <Trash2 size={14} className="text-red-400 opacity-60 hover:opacity-100" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 min-h-[22px] font-sans">
                          {item.consumers.length === 0 ? (
                            <span className="text-[11px] italic text-tm opacity-60">Unassigned</span>
                          ) : (
                            item.consumers.map((c) => (
                              <span
                                key={c}
                                className="text-[10px] px-2 py-0.5 font-bold rounded-lg"
                                style={{ background: C.gold + "15", color: C.gold }}
                              >
                                {c}
                              </span>
                            ))
                          )}
                        </div>
                      </Card>

                      {isSelected && (
                        <div
                          className="absolute right-3 top-3 w-4 h-4 rounded-full flex items-center justify-center bg-gold text-bg"
                          style={{ color: C.bg }}
                        >
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleAddItem} className="flex gap-2.5 font-sans mt-1">
              <input
                type="text"
                required
                placeholder={t("split.dishPlaceholder")}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <input
                type="number"
                step="0.01"
                required
                placeholder={t("split.pricePlaceholder")}
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-24 px-4 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <button
                type="submit"
                className="px-4 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:brightness-110 border-0"
                style={{ background: C.gold, color: C.bg }}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-4 mt-2 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white">{t("split.friendsAvatars")}</h3>
              {selectedItem ? (
                <span className="text-xs text-gold flex items-center gap-1">
                  Assigning to: <span className="font-bold underline">{selectedItem.name}</span>
                </span>
              ) : (
                <span className="text-xs text-red-400">{t("split.selectItemHint")}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 p-5 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
              {allParticipants.map((friend) => {
                const isAssigned = selectedItem ? selectedItem.consumers.includes(friend) : false;
                const initials = getInitials(friend);
                const isMe = friend === myName;
                return (
                  <div key={friend} className="flex flex-col items-center gap-1.5 group relative">
                    <motion.button
                      type="button"
                      onClick={() => handleToggleConsumer(friend)}
                      disabled={!selectedItem}
                      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm transition-all relative border-2 border-solid cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: isAssigned
                          ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`
                          : C.surf,
                        borderColor: isAssigned ? C.gold : C.border,
                        color: isAssigned ? C.bg : C.white,
                      }}
                      whileHover={{ scale: selectedItem ? 1.06 : 1 }}
                      whileTap={{ scale: selectedItem ? 0.94 : 1 }}
                    >
                      {initials}
                      {isAssigned && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-solid bg-green-500 text-white"
                          style={{ borderColor: C.bg }}
                        >
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </motion.button>
                    <span className="text-xs font-semibold text-white group-hover:text-gold transition-colors">
                      {isMe ? `${friend} (${t("common.you")})` : friend}
                    </span>
                    
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/20 text-red-400 items-center justify-center hidden group-hover:flex hover:bg-red-500 hover:text-white border border-red-500/30 font-sans cursor-pointer p-0"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              <form onSubmit={handleAddFriend} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder={`+ ${t("split.addFriend")}`}
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-28 px-3 py-2 rounded-full border text-xs text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 font-sans">
          <Card className="p-4 md:p-6 sticky top-24">
            <h3 className="text-[17px] font-bold text-white mb-4">{t("split.calculationsShare")}</h3>

            {/* Bill Title Input */}
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[11px] text-tm uppercase font-bold tracking-wider pl-0.5">{t("split.billTitle")}</label>
              <input
                type="text"
                placeholder={t("split.billTitlePlaceholder")}
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[11px] text-tm uppercase font-bold tracking-wider pl-0.5">{t("split.whoPaid")}</label>
              <select
                value={activePayer}
                onChange={(e) => setPayer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold cursor-pointer"
                style={{ borderColor: C.border }}
              >
                {allParticipants.map((p) => (
                  <option key={p} value={p}>
                    {p === myName ? `${p} (${t("common.you")})` : p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-tm uppercase font-bold tracking-wider">{t("split.tax")}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-tm uppercase font-bold tracking-wider">{t("split.tip")}</label>
                <input
                  type="number"
                  min="0"
                  value={tip}
                  onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-sm text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3.5 mb-6">
              <h4 className="text-[12px] text-tm uppercase font-bold tracking-wider mb-1">{t("split.debtsDistribution")}</h4>
              {debts.map((debt) => (
                <div key={debt.name} className="flex items-center justify-between text-sm py-1.5 border-b border-solid" style={{ borderColor: C.border + "50" }}>
                  <div>
                    <p className="font-semibold text-white">{debt.name}</p>
                    <p className="text-[10px] text-tm mt-0.5">
                      {t("split.items")}: ${debt.itemCost.toFixed(2)} + {t("split.taxLabel")}: ${debt.tax.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-bold text-gold text-[15px]">${debt.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl flex flex-col gap-2.5 mb-4" style={{ background: C.surf + "40" }}>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.itemsSubtotal")}:</span>
                <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.taxLabel")} ({taxPercent}%):</span>
                <span className="font-semibold text-white">${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-tm">
                <span>{t("split.flatTip")}:</span>
                <span className="font-semibold text-white">${tip.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-1.5" style={{ background: C.border }} />
              <div className="flex justify-between text-sm font-bold text-white">
                <span className="flex items-center gap-1"><ArrowUpRight size={14} color={C.gold} /> {t("split.totalBill")}:</span>
                <span className="text-gold text-[16px]">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {items.length > 0 && friends.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAndSplit}
                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 border-0 text-sm shadow-md"
                style={{ background: C.gold, color: C.bg }}
              >
                <Check size={16} strokeWidth={2.5} />
                Save & Split Bill
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* Premium Success Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div
              className="p-5 rounded-2xl border shadow-2xl flex flex-col items-center text-center gap-3 backdrop-blur-md"
              style={{
                background: `${C.card}ee`,
                borderColor: `${C.gold}50`,
                boxShadow: `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px ${C.gold}15`,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r"
                style={{
                  background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
                }}
              >
                <Check size={24} className="text-[#0e0f11]" strokeWidth={3} />
              </div>
              <div>
                <h4 className="text-white font-bold text-base font-sans">Bill Split Successfully!</h4>
                <p className="text-tm text-xs mt-1 font-sans leading-normal">
                  The split has been calculated and updated in your Running Balances list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessToast(false)}
                className="px-6 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110 cursor-pointer border-0 mt-1"
                style={{ background: C.gold, color: C.bg }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

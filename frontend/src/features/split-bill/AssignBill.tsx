import { useState, useMemo } from "react";
import { Plus, Trash2, ArrowUpRight, X, UsersRound, BookmarkPlus, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { C, Card } from "../../App";

interface SplitItem {
  id: number;
  name: string;
  price: number;
  consumers: string[];
}

import { FriendBalanceItem, FriendGroup, SavedBill } from "./SplitScreen";
import { Transaction } from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import { OcrScannerCard } from "./OcrScannerCard";
import { OcrParsedItem } from "../../services/ocrService";

interface AssignBillProps {
  friends: string[];
  onAddFriend: (name: string) => void;
  onRemoveFriend: (name: string) => void;
  balances: FriendBalanceItem[];
  setBalances: React.Dispatch<React.SetStateAction<FriendBalanceItem[]>>;
  userName: string;
  setBills: React.Dispatch<React.SetStateAction<SavedBill[]>>;
  onAddTransaction?: (tx: Omit<Transaction, "id">) => void;
  groups: FriendGroup[];
  onSaveGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
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
  groups,
  onSaveGroup,
  onDeleteGroup,
}: AssignBillProps) {
  const { t } = useTranslation();
  const { formatCurrency, currency, setCurrency } = useCurrency();
  const [items, setItems] = useState<SplitItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const [newFriendName, setNewFriendName] = useState("");
  const [showSaveGroupInput, setShowSaveGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [apiKeyInput] = useState(() => (import.meta.env.VITE_GROQ_KEY as string) || (import.meta.env.VITE_OPENAI_KEY as string) || localStorage.getItem("groq_api_key") || localStorage.getItem("openai_api_key") || localStorage.getItem("gemini_api_key") || "");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [billTitle, setBillTitle] = useState("");

  const myName = userName || t("common.you");
  const [payer, setPayer] = useState("");
  const activePayer = payer || myName;

  const handleItemsParsed = (parsedItems: OcrParsedItem[]) => {
    let nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    const newSplitItems: SplitItem[] = parsedItems.map((item) => ({
      id: nextId++,
      name: item.name,
      price: item.price,
      consumers: [],
    }));
    setItems((prev) => [...prev, ...newSplitItems]);

    // Dynamic Currency Switching: Always update currency state to match the scanned receipt
    const isUsdReceipt = parsedItems.some(
      (it) => it.currency === "USD" || (it.price > 0 && it.price < 500 && it.price % 1 !== 0)
    ) || (parsedItems.length > 0 && parsedItems.every((it) => it.price > 0 && it.price < 500));

    if (isUsdReceipt) {
      setCurrency("USD");
      // Auto-populate absolute Tax, Tip, Service Charge & Discount for USD receipts if extracted by AI
      const extractedTax = parsedItems.find((it) => typeof it.tax === "number" && it.tax > 0)?.tax ?? 0;
      const extractedTip = parsedItems.find((it) => typeof it.tip === "number" && it.tip > 0)?.tip ?? 0;
      const extractedService = parsedItems.find((it) => typeof it.serviceCharge === "number" && it.serviceCharge > 0)?.serviceCharge ?? 0;
      const extractedDiscount = parsedItems.find((it) => typeof it.discount === "number" && it.discount > 0)?.discount ?? 0;

      setTaxPercent(extractedTax);
      setTip(extractedTip);
      setServiceCharge(extractedService);
      setDiscount(extractedDiscount);
    } else {
      setCurrency("VND");
      // Keep manual tax/tip/serviceCharge/discount for VND receipts (default to 0)
      setTaxPercent(0);
      setTip(0);
      setServiceCharge(0);
      setDiscount(0);
    }
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

  // Recurring groups: apply a saved group by adding its missing members to the roster
  const handleApplyGroup = (group: FriendGroup) => {
    let addedCount = 0;
    group.members.forEach((m) => {
      const clean = m.normalize("NFC").trim();
      if (!clean) return;
      const exists = friends.some(
        (f) => f.normalize("NFC").trim().toLowerCase() === clean.toLowerCase()
      );
      if (!exists) {
        onAddFriend(clean);
        addedCount++;
      }
    });
    if (addedCount === 0) {
      toast.info(t("split.groupAlreadyAdded", "Cả nhóm này đã có trong danh sách bạn bè"));
    }
  };

  const handleSaveGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name || friends.length === 0) return;
    onSaveGroup(name);
    setNewGroupName("");
    setShowSaveGroupInput(false);
    toast.success(t("split.groupSaved", "Đã lưu nhóm!"));
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

  const { debts, subtotal, totalTax, grandTotal } = useMemo(() => {
    const allParticipants = [myName, ...friends];
    const numPeople = allParticipants.length;
    const itemShares: Record<string, number> = {};
    allParticipants.forEach((p) => {
      itemShares[p] = 0;
    });

    const unassignedItems = items.filter((item) => item.consumers.length === 0);
    const totalSharedAmount = unassignedItems.reduce((sum, item) => sum + item.price, 0);
    const sharedAmountPerPerson = numPeople > 0 ? totalSharedAmount / numPeople : 0;

    items.forEach((item) => {
      if (item.consumers.length > 0) {
        const pricePerPerson = item.price / item.consumers.length;
        item.consumers.forEach((c) => {
          if (itemShares[c] !== undefined) {
            itemShares[c] += pricePerPerson;
          }
        });
      }
    });

    const calculatedSubtotal = items.reduce((sum, i) => sum + i.price, 0);

    // Tax is flat absolute dollar value in USD mode, percentage in VND mode
    const calculatedTotalTax = currency === "USD" 
      ? taxPercent 
      : calculatedSubtotal * (taxPercent / 100);

    const tipShare = numPeople > 0 ? tip / numPeople : 0;
    const serviceChargeShare = numPeople > 0 ? serviceCharge / numPeople : 0;

    const calculatedDebts = allParticipants.map((p) => {
      const assignedItemCost = itemShares[p] || 0;
      const personalItemCost = assignedItemCost + sharedAmountPerPerson;

      const discountShare = currency === "USD" || discount > 0
        ? (calculatedSubtotal > 0 ? (personalItemCost / calculatedSubtotal) * discount : (numPeople > 0 ? discount / numPeople : 0))
        : 0;

      const personalTax = currency === "USD"
        ? (calculatedSubtotal > 0 ? (personalItemCost / calculatedSubtotal) * calculatedTotalTax : (numPeople > 0 ? calculatedTotalTax / numPeople : 0))
        : personalItemCost * (taxPercent / 100);

      const totalDue = Math.max(0, personalItemCost - discountShare + personalTax + tipShare + serviceChargeShare);
      return {
        name: p,
        itemCost: personalItemCost,
        tax: personalTax,
        discountShare,
        total: Math.round(totalDue * 100) / 100,
      };
    });

    const calculatedGrandTotal = Math.max(0, calculatedSubtotal - discount + calculatedTotalTax + tip + serviceCharge);

    return {
      debts: calculatedDebts,
      subtotal: calculatedSubtotal,
      totalTax: calculatedTotalTax,
      grandTotal: calculatedGrandTotal,
    };
  }, [items, friends, myName, taxPercent, tip, serviceCharge, discount, currency]);

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

        const activePayerNorm = activePayer.normalize("NFC").trim().toLowerCase();
        const myNameNorm = myName.normalize("NFC").trim().toLowerCase();

        const isFriendThePayer = activePayerNorm === fbNormName;
        const iAmThePayer = activePayerNorm === myNameNorm;

        let diff = 0;
        let amount = 0;
        let desc = "";
        let isLent = false;
        let owedTo = "";

        if (isFriendThePayer) {
          // This friend paid: I owe them my share only (negative balance = I owe).
          const myShare = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm)?.total ?? 0;
          diff = -Math.round(myShare * 100) / 100;
          amount = Math.abs(diff);
          desc = `${finalTitle} (${fb.name} ${t("split.paid") || "đã trả"})`;
          isLent = false;
        } else if (iAmThePayer) {
          // I paid: each friend owes me their share.
          diff = d.total;
          amount = d.total;
          desc = `${finalTitle} (${t("split.youPaid") || "Bạn đã trả"})`;
          isLent = true;
        } else {
          // A third party paid: this friend owes the payer (friend-to-friend debt,
          // recorded on their row so it stays visible in Running Balances).
          amount = d.total;
          desc = `${finalTitle} (${t("split.paidBy") || "Trả bởi"} ${activePayer})`;
          isLent = false;
          if (d.total > 0) {
            owedTo = activePayer;
          }
        }

        if (diff === 0 && !owedTo) return fb;

        return {
          ...fb,
          balance: fb.balance + diff,
          history: [
            {
              id: String(Date.now() + Math.random()),
              date: new Date().toLocaleDateString("vi-VN"),
              amount,
              description: desc,
              isLent,
              isSettled: false,
              owedTo: owedTo || undefined,
            },
            ...fb.history,
          ],
        };
      });
    });

    const newBill: SavedBill = {
      id: Date.now().toString(),
      title: finalTitle,
      date: new Date().toLocaleDateString("vi-VN"),
      grandTotal,
      payer: activePayer,
      items: items.map((i) => ({ ...i })),
      debts: debts.map((d) => ({ name: d.name, total: d.total })),
      taxPercent,
      tip,
    };

    setBills((prev) => [newBill, ...prev]);

    if (onAddTransaction) {
      onAddTransaction({
        name: `Split Bill: ${finalTitle}`,
        amount: grandTotal,
        category: "Food",
        date: new Date().toISOString().split("T")[0],
        walletId: 1,
      });
    }

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      setItems([]);
      setSelectedItemId(null);
      setTaxPercent(0);
      setTip(0);
      setBillTitle("");
    }, 2500);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <>
      <div className="px-5 md:px-0 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-10">
        {/* Left Column: OCR Scanner, Food Item List & Add Form, Friends List */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <OcrScannerCard
            userApiKey={apiKeyInput}
            onItemsParsed={handleItemsParsed}
          />

          {/* Card 2: Items & Assignment Section */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-white font-sans">
                  {t("split.selectFoodTitle")}
                </h3>
                <p className="text-xs text-tm mt-0.5">
                  {t("split.selectFoodSubtitle")}
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <div
                className="py-10 text-center border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 mb-4"
                style={{ borderColor: C.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-surf/80 border border-border flex items-center justify-center text-tm">
                  <span className="text-lg">💲</span>
                </div>
                <p className="text-xs text-tm font-sans">{t("split.noItems")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-4">
                {items.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  const hasConsumers = item.consumers.length > 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelected ? "ring-1" : ""
                      }`}
                      style={{
                        borderColor: isSelected ? C.gold : C.border,
                        background: isSelected ? C.gold + "10" : C.surf + "40",
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            background: hasConsumers ? C.green + "20" : C.gold + "20",
                            color: hasConsumers ? C.green : C.gold,
                          }}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                          <p className="text-xs text-tm font-mono mt-0.5">
                            {formatCurrency(item.price)}
                            {hasConsumers && (
                              <span className="ml-2 text-tm/80">
                                ({formatCurrency(item.price / item.consumers.length)} / {t("split.person") || "người"})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        {/* Consumer badges (Only show when specific consumers are selected) */}
                        {hasConsumers && (
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {item.consumers.map((c) => (
                              <div
                                key={c}
                                title={c}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border text-white shadow-sm"
                                style={{ background: C.surf, borderColor: C.gold }}
                              >
                                {getInitials(c)}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="p-1.5 rounded-lg text-tm hover:text-red hover:bg-red/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual Item Add Form */}
            <form onSubmit={handleAddItem} className="flex gap-2.5">
              <input
                type="text"
                placeholder={t("split.dishPlaceholder")}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <div className="relative w-32 md:w-40">
                <input
                  type="number"
                  placeholder={t("split.pricePlaceholder")}
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold pr-8"
                  style={{ borderColor: C.border }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tm font-bold">
                  {currency === "VND" ? "₫" : "$"}
                </span>
              </div>
              <button
                type="submit"
                className="w-10 h-10 rounded-xl font-bold flex items-center justify-center cursor-pointer transition-all hover:brightness-110 border-0 shadow-md shrink-0"
                style={{ background: C.gold, color: C.bg }}
              >
                <Plus size={18} />
              </button>
            </form>
          </Card>

          {/* Card 3: Friends List Card */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold text-white font-sans">
                {t("split.friendsAvatars")}
              </h3>
              <p className="text-xs text-red font-semibold">
                {t("split.selectItemHint")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border" style={{ borderColor: C.border, background: C.surf + "30" }}>
              {[myName, ...friends].map((personName) => {
                const isMe = personName === myName;
                const isAssignedToSelected = selectedItem?.consumers.includes(personName);

                return (
                  <div
                    key={personName}
                    onClick={() => {
                      if (selectedItemId !== null) {
                        handleToggleConsumer(personName);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                      isAssignedToSelected ? "ring-1" : ""
                    }`}
                    style={{
                      borderColor: isAssignedToSelected ? C.gold : C.border,
                      background: isAssignedToSelected ? C.gold + "20" : C.surf,
                      color: C.white,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border"
                      style={{ background: C.bg, borderColor: C.border }}
                    >
                      {getInitials(personName)}
                    </div>
                    <span>
                      {personName} {isMe && `(${t("common.you")})`}
                    </span>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFriend(personName);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-tm hover:text-red hover:bg-red/10 transition-colors cursor-pointer bg-transparent border-0 p-0 -ml-1"
                        title={t("split.removeFriend")}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Inline Add Friend Input */}
              <form onSubmit={handleAddFriend} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder={`+ ${t("split.addFriend")}`}
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="px-3 py-1.5 rounded-full border text-xs text-white bg-surf outline-none focus:border-gold w-28"
                  style={{ borderColor: C.border }}
                />
              </form>
            </div>

            {/* Recurring Groups Section (Save Group / Frequent Groups) */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-xs font-semibold text-tm flex items-center gap-1.5">
                  <UsersRound size={12} /> {t("split.savedGroups", "Nhóm thường dùng")}
                </h4>

                {showSaveGroupInput ? (
                  <form onSubmit={handleSaveGroupSubmit} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder={t("split.groupNamePlaceholder", "Tên nhóm (vd: Hội ăn trưa)")}
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="px-3 py-1.5 rounded-full border text-xs text-white bg-surf outline-none focus:border-gold w-40 md:w-48"
                      style={{ borderColor: C.border }}
                    />
                    <button
                      type="submit"
                      className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:brightness-110 border-0 shrink-0"
                      style={{ background: C.green, color: C.bg }}
                      title={t("common.save", "Lưu")}
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveGroupInput(false);
                        setNewGroupName("");
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors text-tm hover:text-white hover:bg-surf border-0 p-0 shrink-0"
                      title={t("common.cancel", "Hủy")}
                    >
                      <X size={13} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSaveGroupInput(true)}
                    disabled={friends.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:brightness-110 border disabled:opacity-40 disabled:cursor-not-allowed bg-transparent"
                    style={{ borderColor: C.gold + "55", color: C.gold }}
                    title={t("split.saveGroupHint", "Lưu danh sách bạn bè hiện tại thành nhóm")}
                  >
                    <BookmarkPlus size={12} /> {t("split.saveGroup", "Lưu nhóm này")}
                  </button>
                )}
              </div>

              {groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => handleApplyGroup(g)}
                      className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer transition-all hover:brightness-125"
                      style={{ borderColor: C.border, background: C.surf + "60", color: C.white }}
                      title={g.members.join(", ")}
                    >
                      <UsersRound size={11} style={{ color: C.gold }} />
                      <span>
                        {g.name} <span className="text-tm">({g.members.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGroup(g.id);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-tm hover:text-red hover:bg-red/10 transition-colors cursor-pointer bg-transparent border-0 p-0"
                        title={t("split.removeFriend", "Xoá")}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-tm leading-relaxed">
                  {t(
                    "split.noGroupsHint",
                    "Chưa có nhóm nào. Thêm bạn bè rồi bấm \"Lưu nhóm này\" để tạo nhanh cho lần sau."
                  )}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Calculations Share (Sidebar Card) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-4 md:p-6 flex flex-col gap-4">
            <h3 className="text-[16px] font-semibold text-white font-sans mb-1">
              {t("split.calculationsShare")}
            </h3>

            {/* Bill Title Input */}
            <div>
              <label className="text-xs text-tm mb-1.5 block font-semibold">
                {t("split.billTitle")}
              </label>
              <input
                type="text"
                placeholder={t("split.billTitlePlaceholder")}
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
            </div>

            {/* Who Paid Select */}
            <div>
              <label className="text-xs text-tm mb-1.5 block font-semibold">
                {t("split.whoPaid")}
              </label>
              <select
                value={activePayer}
                onChange={(e) => setPayer(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              >
                <option value={myName}>{myName} ({t("common.you")})</option>
                {friends.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Tax, Tip, Fee & Discount Row */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <div>
                <label className="text-[11px] text-tm mb-1 block font-semibold truncate" title="Tax">
                  {currency === "USD" ? `${t("split.tax")} ($)` : `${t("split.tax")} (%)`}
                </label>
                <input
                  type="number"
                  step={currency === "USD" ? "0.01" : "1"}
                  placeholder="0"
                  value={taxPercent || ""}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div>
                <label className="text-[11px] text-tm mb-1 block font-semibold truncate" title="Tip">
                  {t("split.tip", { symbol: currency === "VND" ? "đ" : "$" })}
                </label>
                <input
                  type="number"
                  step={currency === "USD" ? "0.01" : "1000"}
                  placeholder="0"
                  value={tip || ""}
                  onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div>
                <label className="text-[11px] text-tm mb-1 block font-semibold truncate" title="Service Charge">
                  {t("split.fee", { symbol: currency === "VND" ? "đ" : "$" })}
                </label>
                <input
                  type="number"
                  step={currency === "USD" ? "0.01" : "1000"}
                  placeholder="0"
                  value={serviceCharge || ""}
                  onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 rounded-xl border text-xs text-white bg-surf outline-none focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <div>
                <label className="text-[11px] text-tm mb-1 block font-semibold truncate text-green" title="Discount">
                  {t("split.discount", { symbol: currency === "VND" ? "đ" : "$" })}
                </label>
                <input
                  type="number"
                  step={currency === "USD" ? "0.01" : "1000"}
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 rounded-xl border text-xs text-white bg-surf outline-none focus:border-green"
                  style={{ borderColor: C.border }}
                />
              </div>
            </div>

            {/* Debts Distribution List */}
            <div className="pt-3 border-t flex flex-col gap-2.5" style={{ borderColor: C.border }}>
              <h4 className="text-xs font-semibold text-tm">
                {t("split.debtsDistribution")}
              </h4>

              <div className="flex flex-col gap-2">
                {debts.map((d) => (
                  <div key={d.name} className="flex justify-between items-center text-xs p-2.5 rounded-xl" style={{ background: C.surf + "30" }}>
                    <div className="flex flex-col">
                      <span className="text-white font-semibold">{d.name}</span>
                      <span className="text-[10px] text-tm mt-0.5">
                        {t("split.dishCost") || "Món"}: {formatCurrency(d.itemCost)} + {t("split.taxLabel") || "Thuế"}: {formatCurrency(d.tax)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-white">{formatCurrency(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="pt-3 border-t flex flex-col gap-2 text-xs" style={{ borderColor: C.border }}>
              <div className="flex justify-between text-tm">
                <span>{t("split.itemsSubtotal")}:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green">
                  <span>{t("split.discountLabel") || t("split.discount_label") || "Discount"}:</span>
                  <span className="font-mono font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-tm">
                <span>{t("split.taxLabel")} {currency === "USD" ? "" : `(${taxPercent}%)`}:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between text-tm">
                <span>{t("split.flatTip")}:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(tip)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-tm">
                  <span>{t("split.serviceFee") || t("split.service_fee") || "Service Charge"}:</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(serviceCharge)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-white pt-2.5 border-t items-center" style={{ borderColor: C.border }}>
                <span className="flex items-center gap-1">
                  <ArrowUpRight size={16} color={C.gold} /> {t("split.totalBill")}:
                </span>
                <span className="font-mono text-gold text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Save & Split Button */}
            <button
              type="button"
              onClick={handleSaveAndSplit}
              disabled={items.length === 0}
              className="w-full mt-2 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 text-xs border-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ background: C.gold, color: C.bg }}
            >
              <ArrowUpRight size={16} /> {t("split.saveAndSplit")}
            </button>

            {showSuccessToast && (
              <div className="mt-2 p-2.5 rounded-xl bg-green/20 border border-green text-green text-xs font-semibold text-center animate-fade-in">
                ✓ {t("split.billSavedSuccess") || "Đã lưu hóa đơn thành công!"}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

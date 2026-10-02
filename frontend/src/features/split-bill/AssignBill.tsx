import { useState, useMemo } from "react";
import { Plus, Trash2, ArrowUpRight, Banknote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C, Card } from "../../App";

interface SplitItem {
  id: number;
  name: string;
  price: number;
  discount: number;
  consumers: string[];
}

import { FriendBalanceItem, SavedBill } from "./SplitScreen";
import { Transaction } from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import { OcrScannerCard } from "./OcrScannerCard";
import { OcrScanResult } from "../../services/ocrService";
import { toDisplayedSplitBillAmount, toStoredOcrScanResult, toStoredSplitBillAmount } from "./splitBillAmounts";
import { calculateSplitBill } from "./splitBillCalculator";

interface AssignBillProps {
  friends: string[];
  onAddFriend: (name: string) => void;
  onRemoveFriend: (name: string) => void;
  balances: FriendBalanceItem[];
  setBalances: React.Dispatch<React.SetStateAction<FriendBalanceItem[]>>;
  userName: string;
  setBills: React.Dispatch<React.SetStateAction<SavedBill[]>>;
  onAddTransaction?: (tx: Omit<Transaction, "id">) => void;
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
  const { formatCurrency, currency } = useCurrency();
  const [items, setItems] = useState<SplitItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [tax, setTax] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);

  const [newFriendName, setNewFriendName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [billTitle, setBillTitle] = useState("");

  const myName = userName || t("common.you");
  const [payer, setPayer] = useState("");
  const activePayer = payer || myName;

  const handleItemsParsed = (parsedResult: OcrScanResult) => {
    const parsedResultInStorage = toStoredOcrScanResult(parsedResult, currency);
    let nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    const newSplitItems: SplitItem[] = parsedResultInStorage.items.map((item) => ({
      id: nextId++,
      name: item.name,
      price: item.price,
      discount: 0,
      consumers: [],
    }));
    setItems((prev) => [...prev, ...newSplitItems]);
    setTax(parsedResultInStorage.tax);
    setServiceCharge(parsedResultInStorage.serviceCharge);
    setTip(parsedResultInStorage.tip);
    setBillDiscount(parsedResultInStorage.billDiscount);
    setOtherFees(parsedResultInStorage.otherFees);
    setReceiptTotal(parsedResultInStorage.receiptTotal);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return;

    const nextId = Math.max(0, ...items.map((i) => i.id)) + 1;
    setItems((prev) => [
      ...prev,
      { id: nextId, name: newItemName.trim(), price: toStoredSplitBillAmount(price, currency), discount: 0, consumers: [] },
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

  const handleItemDiscountChange = (id: number, displayedDiscount: number) => {
    setItems((prev) => prev.map((item) => item.id === id
      ? { ...item, discount: Math.min(item.price, toStoredSplitBillAmount(Math.max(displayedDiscount, 0), currency)) }
      : item));
  };

  const { debts, subtotal, itemDiscountTotal, totalTax, grandTotal, receiptDifference } = useMemo(() => {
    return calculateSplitBill({
      participants: [myName, ...friends],
      items,
      tax,
      serviceCharge,
      tip,
      billDiscount,
      otherFees,
      receiptTotal,
    });
  }, [items, friends, myName, tax, serviceCharge, tip, billDiscount, otherFees, receiptTotal]);

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
          desc = `${finalTitle} (${t("split.youPaid") || "Bạn đã trả"})`;
          isLent = true;
        } else if (activePayerNorm === fbNormName) {
          const myDebt = debts.find((x) => x.name.normalize("NFC").trim().toLowerCase() === myNameNorm);
          const myShare = myDebt ? myDebt.total : 0;
          diff = -myShare;
          desc = `${finalTitle} (${fb.name} ${t("split.paid") || "đã trả"})`;
          isLent = false;
        } else {
          diff = 0;
          desc = `${finalTitle} (${t("split.paidBy") || "Trả bởi"} ${activePayer})`;
          isLent = false;
        }

        if (diff === 0) return fb;

        return {
          ...fb,
          balance: fb.balance + diff,
          history: [
            {
              id: String(Date.now() + Math.random()),
              date: new Date().toLocaleDateString("vi-VN"),
              amount: Math.abs(diff),
              description: desc,
              isLent,
              isSettled: false,
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
      tax,
      serviceCharge,
      tip,
      billDiscount,
      otherFees,
      receiptTotal,
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
      setTax(0);
      setServiceCharge(0);
      setTip(0);
      setBillDiscount(0);
      setOtherFees(0);
      setReceiptTotal(null);
      setBillTitle("");
    }, 2500);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <>
      <div className="px-5 md:px-0 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-10">
        {/* Left Column: OCR Scanner, Food Item List & Add Form, Friends List */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <OcrScannerCard onItemsParsed={handleItemsParsed} />

          {/* Card 2: Items & Assignment Section */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--paper-ink)] font-sans">
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
                  <Banknote size={19} aria-hidden="true" />
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
                          <p className="text-sm font-semibold text-[var(--paper-ink)] truncate">{item.name}</p>
                          <p className="text-xs text-tm font-mono mt-0.5">
                            {formatCurrency(item.price)}
                            {item.discount > 0 && (
                              <span className="ml-2 text-green font-semibold">−{formatCurrency(item.discount)}</span>
                            )}
                            {hasConsumers && (
                              <span className="ml-2 text-tm/80">
                                ({formatCurrency(item.price / item.consumers.length)} / {t("split.person") || "người"})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2 md:w-40 shrink-0" onClick={(event) => event.stopPropagation()}>
                          <label htmlFor={`item-discount-${item.id}`} className="text-[10px] text-tm font-semibold whitespace-nowrap">
                            Discount
                          </label>
                          <input
                            id={`item-discount-${item.id}`}
                            type="number"
                            min="0"
                            max={toDisplayedSplitBillAmount(item.price, currency)}
                            placeholder="0"
                            value={item.discount ? toDisplayedSplitBillAmount(item.discount, currency) : ""}
                            onChange={(event) => handleItemDiscountChange(item.id, parseFloat(event.target.value) || 0)}
                            className="w-full min-w-0 px-2.5 py-1.5 rounded-lg border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold"
                            style={{ borderColor: C.border }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        {/* Consumer badges (Only show when specific consumers are selected) */}
                        {hasConsumers && (
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {item.consumers.map((c) => (
                              <div
                                key={c}
                                title={c}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border text-[var(--paper-ink)] shadow-sm"
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
                className="flex-1 px-4 py-2.5 rounded-xl border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              />
              <div className="relative w-32 md:w-40">
                <input
                  type="number"
                  placeholder={t("split.pricePlaceholder")}
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold pr-8"
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
              <h3 className="text-[16px] font-semibold text-[var(--paper-ink)] font-sans">
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
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--paper-ink)] border"
                      style={{ background: C.bg, borderColor: C.border }}
                    >
                      {getInitials(personName)}
                    </div>
                    <span>
                      {personName} {isMe && `(${t("common.you")})`}
                    </span>
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
                  className="px-3 py-1.5 rounded-full border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold w-28"
                  style={{ borderColor: C.border }}
                />
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Calculations Share (Sidebar Card) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-4 md:p-6 flex flex-col gap-4">
            <h3 className="text-[16px] font-semibold text-[var(--paper-ink)] font-sans mb-1">
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
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold"
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
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold"
                style={{ borderColor: C.border }}
              >
                <option value={myName}>{myName} ({t("common.you")})</option>
                {friends.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Receipt adjustments: OCR fills these when present; every field stays editable. */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tax", value: tax, setValue: setTax },
                { label: "Service charge", value: serviceCharge, setValue: setServiceCharge },
                { label: "Tip / gratuity", value: tip, setValue: setTip },
                { label: "Bill discount", value: billDiscount, setValue: setBillDiscount },
                { label: "Other fees", value: otherFees, setValue: setOtherFees },
                { label: "Receipt total", value: receiptTotal ?? 0, setValue: (value: number) => setReceiptTotal(value || null) },
              ].map(({ label, value, setValue }) => (
                <div key={label}>
                  <label htmlFor={`receipt-adjustment-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="text-xs text-tm mb-1.5 block font-semibold">{label}</label>
                  <input
                    id={`receipt-adjustment-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={value ? toDisplayedSplitBillAmount(value, currency) : ""}
                    onChange={(event) => setValue(toStoredSplitBillAmount(parseFloat(event.target.value) || 0, currency))}
                    className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--paper-ink)] bg-surf outline-none focus:border-gold"
                    style={{ borderColor: C.border }}
                  />
                </div>
              ))}
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
                      <span className="text-[var(--paper-ink)] font-semibold">{d.name}</span>
                      <span className="text-[10px] text-tm mt-0.5 leading-relaxed">
                        Item {formatCurrency(d.itemCost)}
                        {d.itemDiscount > 0 && ` − item discount ${formatCurrency(d.itemDiscount)}`}
                        {d.billDiscount > 0 && ` − bill discount ${formatCurrency(d.billDiscount)}`}
                        {d.tax > 0 && ` + tax ${formatCurrency(d.tax)}`}
                        {d.serviceCharge > 0 && ` + service charge ${formatCurrency(d.serviceCharge)}`}
                        {d.tip > 0 && ` + tip ${formatCurrency(d.tip)}`}
                        {d.otherFees > 0 && ` + other fees ${formatCurrency(d.otherFees)}`}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="pt-3 border-t flex flex-col gap-2 text-xs" style={{ borderColor: C.border }}>
              <div className="flex justify-between text-tm">
                <span>{t("split.itemsSubtotal")}:</span>
                <span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(subtotal)}</span>
              </div>
              {itemDiscountTotal > 0 && <div className="flex justify-between text-green"><span>Item discounts:</span><span className="font-mono font-bold">−{formatCurrency(itemDiscountTotal)}</span></div>}
              {billDiscount > 0 && <div className="flex justify-between text-green"><span>Bill discount:</span><span className="font-mono font-bold">−{formatCurrency(billDiscount)}</span></div>}
              {totalTax > 0 && <div className="flex justify-between text-tm"><span>Tax:</span><span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(totalTax)}</span></div>}
              {serviceCharge > 0 && <div className="flex justify-between text-tm"><span>Service charge:</span><span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(serviceCharge)}</span></div>}
              {tip > 0 && <div className="flex justify-between text-tm"><span>Tip / gratuity:</span><span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(tip)}</span></div>}
              {otherFees > 0 && <div className="flex justify-between text-tm"><span>Other fees:</span><span className="font-mono font-bold text-[var(--paper-ink)]">{formatCurrency(otherFees)}</span></div>}
              {receiptTotal !== null && <div className={`flex justify-between ${receiptDifference === 0 ? "text-green" : "text-red"}`}><span>{receiptDifference === 0 ? "Matches receipt" : "Receipt difference"}:</span><span className="font-mono font-bold">{receiptDifference === 0 ? formatCurrency(receiptTotal) : formatCurrency(Math.abs(receiptDifference ?? 0))}</span></div>}

              <div className="flex justify-between text-sm font-bold text-[var(--paper-ink)] pt-2.5 border-t items-center" style={{ borderColor: C.border }}>
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

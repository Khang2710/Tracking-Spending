import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, User, DollarSign, X, ChevronDown, ChevronUp, AlertCircle, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { C, Card } from "./App";
import { SavedBill } from "./SplitScreen";

interface BillHistoryProps {
  bills: SavedBill[];
  onDeleteBill?: (id: string) => void;
  userName: string;
}

export default function BillHistory({ bills, onDeleteBill, userName }: BillHistoryProps) {
  const { t } = useTranslation();
  const [selectedBill, setSelectedBill] = useState<SavedBill | null>(null);
  const myName = userName || t("common.you");

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="px-5 md:px-0 max-w-2xl w-full mx-auto pb-10 font-sans">
      <Card className="overflow-hidden border border-solid" style={{ borderColor: C.border }}>
        <div className="p-4 border-b border-solid" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-tm">{t("split.savedBillsHistory")}</h3>
        </div>

        <div className="flex flex-col">
          {bills.length === 0 ? (
            <div className="p-12 text-center text-sm text-tm flex flex-col items-center gap-3">
              <Receipt size={36} color={C.tm} className="opacity-45" />
              {t("split.noSavedBills")}
              <span className="text-xs opacity-60">{t("split.noSavedBillsHint")}</span>
            </div>
          ) : (
            bills.map((bill) => {
              const payerName = bill?.payer || "";
              const isPaidByMe = payerName.normalize("NFC").trim().toLowerCase() === myName.normalize("NFC").trim().toLowerCase();
              const grandTotal = typeof bill?.grandTotal === "number" ? bill.grandTotal : Number(bill?.grandTotal) || 0;
              const itemsCount = Array.isArray(bill?.items) ? bill.items.length : 0;
              return (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBill(bill)}
                  className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer border-b border-solid last:border-b-0 transition-colors hover:bg-surf/30"
                  style={{ borderColor: C.border }}
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-white truncate">{bill?.title || "Hóa đơn"}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tm mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {bill?.date || ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {t("split.payerLabel")}:{" "}
                        <span className={isPaidByMe ? "text-green-400 font-bold" : "text-white"}>
                          {isPaidByMe ? t("common.you") : payerName}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[15px] font-extrabold text-gold">${grandTotal.toFixed(2)}</p>
                    <span className="text-[10px] text-tm uppercase tracking-wider mt-1 block">
                      {itemsCount} {t("split.items")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Bill Itemized Details Modal */}
      <AnimatePresence>
        {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-[#000000aa] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBill(null)}
            />

            <motion.div
              className="relative w-full max-w-lg rounded-3xl border border-solid shadow-2xl overflow-hidden"
              style={{ background: C.card, borderColor: C.border }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-solid" style={{ borderColor: C.border }}>
                <div>
                  <h3 className="font-bold text-white text-[16px]">{selectedBill.title}</h3>
                  <p className="text-[11px] text-tm mt-0.5">{selectedBill.date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-surf cursor-pointer border-0 bg-transparent"
                >
                  <X size={16} color={C.tm} />
                </button>
              </div>

              {/* Scrollable details wrapper */}
              <div className="max-h-[60vh] overflow-y-auto p-6 flex flex-col gap-6 hide-scroll">
                {/* Summary Card */}
                <div className="p-4 rounded-2xl flex items-center justify-between text-sm" style={{ background: C.surf + "30" }}>
                  <div>
                    <p className="text-xs text-tm uppercase font-bold tracking-wider mb-1">Paid By</p>
                    <span className="font-bold text-white flex items-center gap-1">
                      {selectedBill.payer.normalize("NFC").trim().toLowerCase() === myName.normalize("NFC").trim().toLowerCase()
                        ? `${selectedBill.payer} (You)`
                        : selectedBill.payer}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-tm uppercase font-bold tracking-wider mb-1">Total Bill</p>
                    <span className="text-xl font-black text-gold">${selectedBill.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Itemized List */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[11px] text-tm uppercase font-bold tracking-wider mb-1">Itemized breakdown</h4>
                  <div className="flex flex-col gap-2.5">
                    {selectedBill.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-solid flex flex-col gap-2"
                        style={{ background: C.card, borderColor: C.border + "60" }}
                      >
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="font-semibold text-gold">${item.price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-tm uppercase font-bold tracking-wider mr-1">Consumers:</span>
                          {item.consumers.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] px-2 py-0.5 font-bold rounded-lg font-sans"
                              style={{ background: C.gold + "15", color: C.gold }}
                            >
                              {c.normalize("NFC").trim().toLowerCase() === myName.normalize("NFC").trim().toLowerCase() ? "You" : c}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotals card */}
                <div className="p-4 rounded-2xl flex flex-col gap-2" style={{ background: C.surf + "15" }}>
                  <div className="flex justify-between text-xs text-tm">
                    <span>Tax ({selectedBill.taxPercent}%):</span>
                    <span className="font-semibold text-white">
                      ${(selectedBill.items.reduce((s, i) => s + i.price, 0) * (selectedBill.taxPercent / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-tm">
                    <span>Flat Tip:</span>
                    <span className="font-semibold text-white">${selectedBill.tip.toFixed(2)}</span>
                  </div>
                </div>

                {/* Debts distribution */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[11px] text-tm uppercase font-bold tracking-wider mb-1">Debts distribution</h4>
                  <div className="flex flex-col gap-2">
                    {selectedBill.debts.map((d) => {
                      const isMe = d.name.normalize("NFC").trim().toLowerCase() === myName.normalize("NFC").trim().toLowerCase();
                      return (
                        <div
                          key={d.name}
                          className="flex items-center justify-between text-sm py-2 border-b border-solid last:border-b-0"
                          style={{ borderColor: C.border + "40" }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px]"
                              style={{ background: C.surf, color: C.white }}
                            >
                              {getInitials(d.name)}
                            </div>
                            <span className="font-semibold text-white">{isMe ? `${d.name} (You)` : d.name}</span>
                          </div>
                          <span className="font-bold text-white">${d.total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-solid flex justify-between gap-3" style={{ borderColor: C.border }}>
                {onDeleteBill && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBill(selectedBill.id);
                      setSelectedBill(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 cursor-pointer border border-solid border-red-500/20 bg-transparent transition-colors"
                  >
                    Delete Record
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 cursor-pointer border-0 ml-auto"
                  style={{ background: C.gold, color: C.bg }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

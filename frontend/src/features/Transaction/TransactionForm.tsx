import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { C } from "../../App";
import { useCurrency } from "../../context/CurrencyContext";
import type { Wallet, Transaction } from "../../App";

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
        const backendHost = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
        const url = `${backendHost}/api/ai/guess-category?title=${encodeURIComponent(title.trim())}`;
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

export const TRANSACTION_CATEGORIES = [
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

export function AddTransactionForm({
  wallets,
  onAdd,
}: {
  wallets: Wallet[];
  onAdd: (tx: Omit<Transaction, "id">, walletId: number) => void;
}) {
  const { t } = useTranslation();
  const { currency, exchangeRate, formatCurrency } = useCurrency();

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

  useEffect(() => {
    if (guessedCategory && !hasManuallySelected) {
      const matchedCat = TRANSACTION_CATEGORIES.find(c => c.toLowerCase() === guessedCategory.toLowerCase()) || "Others";
      setCategory(matchedCat);
    }
  }, [guessedCategory, hasManuallySelected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    const rawAmt = parseFloat(amount);
    if (isNaN(rawAmt) || rawAmt <= 0) return;

    const numAmt = currency === "USD" ? Math.round(rawAmt * exchangeRate) : Math.round(rawAmt);
    const finalAmount = type === "outcome" ? -numAmt : numAmt;
    const [year, month, day] = date.split("-");
    const formattedDate = `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;

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
          className="flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer text-xs md:text-sm"
          style={{
            background: type === "outcome" ? C.red : "transparent",
            color: type === "outcome" ? C.white : C.tm,
          }}
        >
          {t("stats.outcome", "Chi tiêu")}
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
          {t("stats.income", "Thu nhập")}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.description", "Mô tả / Tên giao dịch")}
        </label>
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
        <label className="text-xs text-tm font-medium">
          {t("dashboard.amount", "Số tiền")} ({currency})
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-tm font-medium">
            {t("dashboard.category", "Danh mục")}
          </label>
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
          {TRANSACTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-sec">
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.payWith", "Tài khoản / Ví")}
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
          {t("dashboard.date", "Ngày giao dịch")}
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

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer"
        style={{ background: C.gold, color: C.bg }}
      >
        {t("dashboard.saveTransaction", "Lưu giao dịch")}
      </button>
    </form>
  );
}

export function EditTransactionForm({
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
  const { currency, exchangeRate, formatCurrency } = useCurrency();

  const [name, setName] = useState(transaction.name);

  const initialDisplayAmount = () => {
    const absVnd = Math.abs(transaction.amount);
    if (currency === "USD") {
      return Number((absVnd / exchangeRate).toFixed(2)).toString();
    }
    return String(absVnd);
  };

  const [amount, setAmount] = useState(initialDisplayAmount);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    const rawAmt = parseFloat(amount);
    if (isNaN(rawAmt) || rawAmt <= 0) return;

    const numAmt = currency === "USD" ? Math.round(rawAmt * exchangeRate) : Math.round(rawAmt);
    const finalAmount = type === "outcome" ? -numAmt : numAmt;
    const [year, month, day] = date.split("-");
    const formattedDate = `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;

    onSave({
      ...transaction,
      name,
      amount: finalAmount,
      category,
      date: formattedDate,
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
          {t("stats.outcome", "Chi tiêu")}
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
          {t("stats.income", "Thu nhập")}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.description", "Mô tả / Tên giao dịch")}
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
          {t("dashboard.amount", "Số tiền")}
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
          {t("dashboard.category", "Danh mục")}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        >
          {TRANSACTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-sec">
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">
          {t("dashboard.payWith", "Tài khoản / Ví")}
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
          {t("dashboard.date", "Ngày giao dịch")}
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
            {t("common.delete", "Xóa")}
          </button>
        )}
        <button
          type="submit"
          className="flex-[2] py-3 rounded-xl font-bold transition-all cursor-pointer"
          style={{ background: C.gold, color: C.bg }}
        >
          {t("dashboard.saveTransaction", "Lưu giao dịch")}
        </button>
      </div>
    </form>
  );
}

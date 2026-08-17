import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  BarChart2,
  TrendingUp,
  Plus,
  ChevronRight,
  Search,
  House,
  Car,
  Fuel,
  Building2,
  ShoppingBag,
  Wallet,
  Users,
  Sparkles,
  Settings,
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Mail,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast, Toaster } from "sonner";
import { useAuth } from "./contexts/AuthContext";
import SplitScreen from "./features/split-bill/SplitScreen";
import Dashboard from "./features/dashboard/Dashboard";
import WalletManager, { WalletDialog } from "./features/wallet/WalletManager";
import TransactionManager, { TransactionDialog } from "./features/Transaction/TransactionManager";
import StatisticsScreen, { AddGoalModal } from "./features/Statistics/Statistics";
import BudgetManager from "./features/budget/BudgetManager";
import { useTranslation } from "react-i18next";
import { useSyncData } from "./hooks/useSyncData";

export interface AppCacheData {
  wallets: Wallet[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budget: number;
  categoryBudgets: Record<string, number>;
}

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


const initialTransactions: Transaction[] = [];

const initialWallets: Wallet[] = [];

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

export function ProgressBar({
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

export function SectionHeader({
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



// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
// Helper to extract month index (0-11) and year from any date string
export const parseDateInfo = (dateStr: string): { month: number; year: number } => {
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
    <motion.button
      onClick={toggleLanguage}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.white,
      }}
      title={currentLang.startsWith("vi") ? "Switch to English" : "Chuyển sang Tiếng Việt"}
    >
      <span>{currentLang.startsWith("vi") ? "🇻🇳 VI" : "🇺🇸 EN"}</span>
    </motion.button>
  );
}

function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <motion.button
      onClick={toggleCurrency}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all duration-300 hover:border-gold/30 hover:bg-surf/40 cursor-pointer border flex items-center gap-1.5"
      style={{
        background: C.card,
        borderColor: C.border,
        color: C.gold,
      }}
      title={currency === "VND" ? "Chuyển sang USD ($)" : "Chuyển sang VND (₫)"}
    >
      <span>{currency === "VND" ? "🇻🇳 ₫ VND" : "🇺🇸 $ USD"}</span>
    </motion.button>
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
export function Modal({
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

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // User Onboarding State (tên hiển thị tùy chỉnh, override tên từ auth)
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("wealthy_user_name") || "";
  });

  // Tên hiển thị: custom name > OAuth full_name > email prefix > "User"
  const authDisplayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "";
  const displayName = userName || authDisplayName || "User";

  const { session } = useAuth();
  const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:8080";

  // Offline Cache Helper (Stale-While-Revalidate)
  const getOfflineCache = () => {
    try {
      const raw = localStorage.getItem("wealthy_offline_cache");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const initialCache = getOfflineCache();

  // Initial Budget Resolvers (with fallback to wealthy_v2_budget)
  const getInitialBudget = (): number => {
    if (typeof initialCache?.budget === "number" && initialCache.budget > 0) {
      return initialCache.budget;
    }
    const legacy = localStorage.getItem("wealthy_v2_budget");
    if (legacy) {
      const parsed = parseFloat(legacy);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  const getInitialCategoryBudgets = (): Record<string, number> => {
    if (initialCache?.categoryBudgets && Object.keys(initialCache.categoryBudgets).length > 0) {
      return initialCache.categoryBudgets;
    }
    const legacy = localStorage.getItem("wealthy_v2_category_budgets");
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {}
    }
    return {};
  };

  // React States
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialCache?.transactions?.length ? initialCache.transactions : initialTransactions
  );
  const [wallets, setWallets] = useState<Wallet[]>(
    initialCache?.wallets?.length ? initialCache.wallets : initialWallets
  );
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(
    initialCache?.savingsGoals || []
  );
  const [budget, setBudget] = useState<number>(getInitialBudget);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(getInitialCategoryBudgets);

  // Bootstrap API Fetcher for useSyncData
  const fetchBootstrapData = useCallback(async (): Promise<AppCacheData | null> => {
    if (!session?.access_token) return null;

    const res = await fetch(`${BACKEND_URL}/api/sync/bootstrap`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch bootstrap data (${res.status})`);
    }

    const bootstrapData = await res.json();

    const cloudWallets: Wallet[] = Array.isArray(bootstrapData.wallets) && bootstrapData.wallets.length > 0
      ? bootstrapData.wallets.map((w: any) => ({
          id: w.id,
          label: w.name || w.label || "Ví chính",
          balance: typeof w.balance === "number" ? w.balance : 0,
          accent: C.gold,
        }))
      : wallets;

    const cloudTxs: Transaction[] = Array.isArray(bootstrapData.transactions)
      ? bootstrapData.transactions.map((t: any) => ({
          id: t.id,
          name: t.name || t.category || "Giao dịch",
          date: t.date || new Date().toISOString(),
          amount: typeof t.amount === "number" ? t.amount : 0,
          category: t.category || "General",
          walletId: t.wallet?.id || 1,
        }))
      : transactions;

    const cloudGoals: SavingsGoal[] = Array.isArray(bootstrapData.savingsGoals)
      ? bootstrapData.savingsGoals.map((g: any) => ({
          id: g.id,
          title: g.title,
          targetAmount: Number(g.targetAmount) || 0,
          currentAmount: Number(g.currentAmount) || 0,
          icon: g.icon || "PiggyBank",
          color: g.color || C.gold,
          deadline: g.deadline || "",
          status: g.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        }))
      : savingsGoals;

    let totalB = getInitialBudget();
    let catBMap = getInitialCategoryBudgets();

    if (Array.isArray(bootstrapData.budgets) && bootstrapData.budgets.length > 0) {
      let cloudTotal = 0;
      const cloudCatMap: Record<string, number> = {};
      bootstrapData.budgets.forEach((b: any) => {
        if (b.category === "TOTAL") {
          cloudTotal = Number(b.amount) || 0;
        } else {
          cloudCatMap[b.category] = Number(b.amount) || 0;
        }
      });
      if (cloudTotal > 0) totalB = cloudTotal;
      if (Object.keys(cloudCatMap).length > 0) catBMap = cloudCatMap;
    }

    return {
      wallets: cloudWallets,
      transactions: cloudTxs,
      savingsGoals: cloudGoals,
      budget: totalB,
      categoryBudgets: catBMap,
    };
  }, [session?.access_token]);

  // Use Generic SWR Custom Hook with Cross-Device revalidateOnFocus
  const { data: syncData, isLoading, mutate: revalidateApp } = useSyncData<AppCacheData | null>(
    "wealthy_offline_cache",
    fetchBootstrapData,
    {
      fallbackData: {
        wallets: initialCache?.wallets?.length ? initialCache.wallets : initialWallets,
        transactions: initialCache?.transactions?.length ? initialCache.transactions : initialTransactions,
        savingsGoals: initialCache?.savingsGoals || [],
        budget: getInitialBudget(),
        categoryBudgets: getInitialCategoryBudgets(),
      },
      revalidateOnFocus: true,
    }
  );

  // Trigger initial fetch when session becomes available to fix empty state bugs
  useEffect(() => {
    if (session?.access_token) {
      revalidateApp();
    }
  }, [session?.access_token, revalidateApp]);

  // Sync SWR Data to local Component States when data revalidates
  useEffect(() => {
    if (syncData) {
      if (syncData.wallets?.length) {
        setWallets(syncData.wallets);
      }
      if (syncData.transactions) {
        setTransactions(syncData.transactions);
      }
      if (syncData.savingsGoals) {
        setSavingsGoals(syncData.savingsGoals);
      }
      if (typeof syncData.budget === "number" && syncData.budget > 0) {
        setBudget(syncData.budget);
      }
      if (syncData.categoryBudgets && Object.keys(syncData.categoryBudgets).length > 0) {
        setCategoryBudgets(syncData.categoryBudgets);
      }
    }
  }, [syncData]);

  const [searchQuery, setSearchQuery] = useState("");

  // Soft-delete with undo: tracks transaction IDs pending permanent deletion
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const pendingDeleteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Modal Visibility States
  const [txDialog, setTxDialog] = useState<TransactionDialog>(null);
  const [walletDialog, setWalletDialog] = useState<WalletDialog>(null);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedGoalToAction, setSelectedGoalToAction] = useState<SavingsGoal | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");

  // Track transaction IDs applied to wallet balances
  const [appliedTxIds, setAppliedTxIds] = useState<number[]>([]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_budget", budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_category_budgets", JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem("wealthy_v2_applied_tx_ids", JSON.stringify(appliedTxIds));
  }, [appliedTxIds]);

  // Reconcile unapplied transactions (e.g. Split Bill transactions) to active wallet balance
  useEffect(() => {
    if (wallets.length > 0 && transactions.length > 0) {
      const activeWallet = wallets[0];
      const appliedSet = new Set(appliedTxIds);
      const unappliedTxs = transactions.filter((t) => !appliedSet.has(t.id));

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

  // Cleanup pending-delete timers on unmount
  useEffect(() => {
    return () => {
      pendingDeleteTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

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

    setTxDialog(null);
  };

  // Handle deletion of a transaction (soft-delete with 5s undo window)
  const handleDeleteTransaction = (txId: number) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    if (pendingDeleteIds.has(txId)) return;

    // Immediately hide from UI
    setPendingDeleteIds((prev) => new Set(prev).add(txId));

    // Show toast with Undo action
    toast(t("common.transactionDeleted", "Đã xóa giao dịch"), {
      description: tx.name,
      action: {
        label: t("common.undo", "Hoàn tác"),
        onClick: () => {
          const timer = pendingDeleteTimers.current.get(txId);
          if (timer) {
            clearTimeout(timer);
            pendingDeleteTimers.current.delete(txId);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(txId);
            return next;
          });
        },
      },
      duration: 5000,
    });

    // Schedule actual permanent deletion after 5 seconds
    const timer = setTimeout(() => {
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      setWallets((prev) =>
        prev.map((w) =>
          (w.id === tx.walletId || (prev.length === 1))
            ? { ...w, balance: w.balance - tx.amount }
            : w
        )
      );
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
      pendingDeleteTimers.current.delete(txId);
    }, 5000);

    pendingDeleteTimers.current.set(txId, timer);
  };

  const handleEditTxClick = (tx: Transaction) => {
    setTxDialog({ mode: "edit", tx });
  };

  const handleSaveTxEdit = (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) return;

    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );

    setWallets((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((w) => {
        let newBal = w.balance;
        // Revert old tx amount from old wallet
        if (w.id === oldTx.walletId || (prev.length === 1 && w.id === prev[0].id)) {
          newBal -= oldTx.amount;
        }
        // Add updated tx amount to updated wallet
        if (w.id === updatedTx.walletId || (prev.length === 1 && w.id === prev[0].id)) {
          newBal += updatedTx.amount;
        }
        return { ...w, balance: newBal };
      });
    });

    setTxDialog(null);
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
  const visibleTransactions = transactions.filter(
    (t) =>
      !pendingDeleteIds.has(t.id) &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const visibleAllTransactions = transactions.filter((t) => !pendingDeleteIds.has(t.id));

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const activeSavingsSum = savingsGoals
    .filter((g) => g.status === "IN_PROGRESS")
    .reduce((sum, g) => sum + g.currentAmount, 0);
  const availableBalance = Math.max(0, totalBalance - activeSavingsSum);

  const screens = [
    <Dashboard
      wallets={wallets}
      transactions={visibleTransactions}
      budget={budget}
      onEditBudgetClick={() => setIsBudgetModalOpen(true)}
      onAddTransactionClick={() => setTxDialog({ mode: "add" })}
      onAddWalletClick={() => setWalletDialog({ mode: "add" })}
      userName={userName}
      onEditName={handleEditName}
      onEditWalletClick={(wallet) => setWalletDialog({ mode: "edit", wallet })}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={handleEditTxClick}
    />,
    <StatisticsScreen
      wallets={wallets}
      transactions={visibleAllTransactions}
      budget={budget}
      savingsGoals={savingsGoals}
      availableBalance={availableBalance}
      totalBalance={totalBalance}
      onAddGoalClick={() => setIsAddGoalModalOpen(true)}
      onDeposit={handleDepositToGoal}
      onWithdraw={handleWithdrawFromGoal}
      onDeleteGoal={handleDeleteGoal}
      onDeleteTransaction={handleDeleteTransaction}
      onEditTransaction={handleEditTxClick}
    />,
    <SplitScreen userName={displayName} onAddTransaction={handleAddTransaction} />,
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
        <Sidebar active={activeTab} onChange={setActiveTab} userName={displayName} onEditName={handleEditName} />

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
                  <span className="text-[11px] md:text-[15px] hidden md:inline" style={{ color: C.tm }}>
                    • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h2
                  className="text-base md:text-2xl font-bold cursor-pointer hover:text-gold transition-colors flex items-center gap-1.5 truncate text-white"
                  onClick={handleEditName}
                >
                  <span className="truncate">{t("dashboard.welcome")}, {displayName}</span> 👋
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                onClick={() => setTxDialog({ mode: "add" })}
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {screens[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Transaction Manager (Add Drawer + Edit Modal) */}
      <TransactionManager
        wallets={wallets}
        dialog={txDialog}
        onDialogClose={() => setTxDialog(null)}
        onAddTransaction={handleAddTransaction}
        onSaveTxEdit={handleSaveTxEdit}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {/* Wallet Manager (Add/Edit/Delete Wallet modals) */}
      <WalletManager
        wallets={wallets}
        setWallets={setWallets}
        dialog={walletDialog}
        onDialogClose={() => setWalletDialog(null)}
      />

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
          initialName={userName || authDisplayName}
          onSave={(newName) => {
            setUserName(newName);
            localStorage.setItem("wealthy_user_name", newName);
            setIsProfileModalOpen(false);
          }}
        />
        {/* Signed-in account info + sign out */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: C.border }}>
          {user?.email && (
            <p className="text-[11px] text-tm mb-3 flex items-center gap-1.5 font-sans truncate">
              <Mail size={11} className="shrink-0" /> {user.email}
            </p>
          )}
          <button
            onClick={() => {
              signOut();
              localStorage.removeItem("wealthy_user_name");
              setIsProfileModalOpen(false);
            }}
            className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all bg-red-500/15 text-red hover:bg-red-500/25 border border-red-500/30"
          >
            {t("auth.logout", "Đăng xuất")}
          </button>
        </div>
      </Modal>

      {/* Edit Budget Modal */}
      <BudgetManager
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budget={budget}
        categoryBudgets={categoryBudgets}
        transactions={transactions}
        onSave={async (newBudget, newCats) => {
          if (!session?.access_token) {
            throw new Error("Bạn chưa đăng nhập");
          }

          const currentMonthStr = new Date().toISOString().slice(0, 7);
          const res = await fetch(`${BACKEND_URL}/api/budgets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              periodMonth: currentMonthStr,
              totalBudget: newBudget,
              categoryBudgets: newCats,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            let errMsg = `Lưu ngân sách lên PostgreSQL thất bại (${res.status})`;
            try {
              const parsed = JSON.parse(errBody);
              if (parsed?.message) errMsg += `: ${parsed.message}`;
            } catch (e) {
              if (errBody) errMsg += `: ${errBody}`;
            }
            console.error(`[Budget] REST API failed with status ${res.status}:`, errBody);
            throw new Error(errMsg);
          }

          const cloudBudgets = await res.json();
          if (Array.isArray(cloudBudgets)) {
            let totalB = 0;
            const catBMap: Record<string, number> = {};
            cloudBudgets.forEach((b: any) => {
              if (b.category === "TOTAL") {
                totalB = Number(b.amount) || 0;
              } else {
                catBMap[b.category] = Number(b.amount) || 0;
              }
            });
            const finalTotal = totalB > 0 ? totalB : newBudget;
            const finalCats = Object.keys(catBMap).length > 0 ? catBMap : newCats;

            setBudget(finalTotal);
            setCategoryBudgets(finalCats);

            // Update SWR cache and trigger revalidation
            try {
              const currentCache = getOfflineCache() || {};
              const updatedCache = {
                ...currentCache,
                budget: finalTotal,
                categoryBudgets: finalCats,
              };
              const cacheStr = JSON.stringify(updatedCache);
              localStorage.setItem("wealthy_offline_cache", cacheStr);
              localStorage.setItem("wealthy_v2_budget", finalTotal.toString());
              localStorage.setItem("wealthy_v2_category_budgets", JSON.stringify(finalCats));

              window.dispatchEvent(new StorageEvent("storage", {
                key: "wealthy_offline_cache",
                newValue: cacheStr,
              }));

              revalidateApp();
            } catch (e) {
              console.error("[Cache] Failed to update budget cache:", e);
            }
          }
        }}
      />

      {/* Toast Notifications (Undo delete, group saved, etc.) */}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: C.card,
            border: `1px solid ${C.border}`,
            color: C.white,
          },
          actionButtonStyle: {
            background: C.gold,
            color: C.bg,
            fontWeight: 700,
          },
        }}
      />

    </>
  );
}


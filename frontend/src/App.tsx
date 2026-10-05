import { useEffect, useRef, useState, type ComponentProps } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";
import { useCurrency } from "./context/CurrencyContext";
import { useAuth } from "./features/auth/AuthProvider";
import { AppOverlays } from "./features/app/AppOverlays";
import { useFinanceWorkspace } from "./features/finance-data/useFinanceWorkspace";
import { HomeScreen } from "./features/home/HomeScreen";
import { SettingsScreen } from "./features/preferences/SettingsScreen";
import SplitScreen from "./features/split-bill/SplitScreen";
import { StatisticsScreen } from "./features/statistics/StatisticsScreen";
import { supabase } from "./lib/supabase";
import { AppShell } from "./layout/AppShell";
import type { AppDestination } from "./layout/navigation";
import type { Transaction, Wallet } from "./types/finance";

export type { SavingsGoal, Transaction, Wallet } from "./types/finance";
export { C } from "./design/tokens";
export { Card } from "./components/common/Card";

export default function App() {
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const { user } = useAuth();
  const isVietnamese = i18n.language?.startsWith("vi") ?? false;
  const finance = useFinanceWorkspace({ userId: user?.id, isVietnamese });
  const [activeTab, setActiveTab] = useState<AppDestination>("home");
  const [userName, setUserName] = useState(() => localStorage.getItem("wealthy_user_name") || "");
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const transactionReturnFocusRef = useRef<HTMLElement | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase.from("tracker_profiles").upsert({
      id: user.id,
      preferred_language: isVietnamese ? "vi" : "en",
      preferred_currency: currency,
    }).then(({ error }) => {
      if (error) console.error("Unable to persist user preferences", error);
    });
  }, [currency, isVietnamese, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const openTransaction = (returnFocusTo?: HTMLElement | null) => {
    transactionReturnFocusRef.current = returnFocusTo ?? null;
    setIsTransactionOpen(true);
  };

  const addTransaction = async (transaction: Omit<Transaction, "id">, walletId?: number) => {
    if ((await finance.addTransaction(transaction, walletId)).ok) setIsTransactionOpen(false);
  };
  const saveTransaction = async (transaction: Transaction) => {
    if ((await finance.updateTransaction(transaction)).ok) setTransactionToEdit(null);
  };
  const deleteEditedTransaction = async (id: number) => {
    if ((await finance.deleteTransaction(id)).ok) setTransactionToEdit(null);
  };
  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    if ((await finance.addWallet(wallet)).ok) setIsAddWalletOpen(false);
  };
  const saveWallet = async (wallet: Wallet) => {
    if ((await finance.updateWallet(wallet)).ok) setWalletToEdit(null);
  };
  const deleteWallet = async (id: number) => {
    if ((await finance.deleteWallet(id)).ok) setWalletToEdit(null);
  };
  const addSavingsGoal: ComponentProps<typeof AppOverlays>["savingsGoal"]["onAdd"] = async (goal) => {
    const result = await finance.addSavingsGoal(goal);
    if (!result.ok) return;
    setIsAddGoalOpen(false);
    if (result.completed) triggerConfetti();
  };
  const depositToGoal = async (goalId: number, amount: number) => {
    if ((await finance.depositToSavingsGoal(goalId, amount)).completedNow) triggerConfetti();
  };
  const saveUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("wealthy_user_name", name);
    setIsProfileOpen(false);
  };

  if (!finance.isReady) {
    return <WorkspaceLoadingState status={finance.loadStatus} error={finance.loadError} isVietnamese={isVietnamese} onRetry={finance.retryLoad} />;
  }

  const screen = activeTab === "home" ? (
    <HomeScreen
      wallets={finance.wallets}
      transactions={finance.transactions.map((transaction) => ({ ...transaction, note: transaction.note ?? null }))}
      budget={finance.budget}
      onEditBudget={() => setIsBudgetOpen(true)}
      onAddTransaction={() => openTransaction()}
      onAddWallet={() => setIsAddWalletOpen(true)}
      onEditWallet={setWalletToEdit}
      onDeleteTransaction={finance.deleteTransaction}
      onEditTransaction={setTransactionToEdit}
      upcomingExpenses={finance.upcomingExpenses}
      onConfirmRecurring={finance.confirmRecurringExpense}
      onConfigureRecurring={() => setActiveTab("settings")}
    />
  ) : activeTab === "statistics" ? (
    <div className="min-h-[100dvh] bg-[var(--paper-canvas)] px-4 pb-32 pt-6 text-[var(--paper-ink)] md:px-8 md:pb-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <StatisticsScreen
          wallets={finance.wallets}
          transactions={finance.transactions}
          budget={finance.budget}
          savingsGoals={finance.savingsGoals}
          availableBalance={finance.availableBalance}
          totalBalance={finance.totalBalance}
          onAddGoalClick={() => setIsAddGoalOpen(true)}
          onDeposit={depositToGoal}
          onWithdraw={finance.withdrawFromSavingsGoal}
          onDeleteGoal={finance.deleteSavingsGoal}
          onDeleteTransaction={finance.deleteTransaction}
          onEditTransaction={setTransactionToEdit}
        />
      </div>
    </div>
  ) : activeTab === "split-bill" ? (
    <div className="min-h-[100dvh] bg-[var(--paper-canvas)] px-4 py-6 text-[var(--paper-ink)] md:px-8">
      <SplitScreen userName={userName} onAddTransaction={addTransaction} />
    </div>
  ) : (
    <SettingsScreen
      userName={userName}
      expenses={finance.recurringExpenses}
      wallets={finance.wallets}
      onEditProfile={() => setIsProfileOpen(true)}
      onAddRecurring={finance.addRecurringExpense}
      onUpdateRecurring={finance.updateRecurringExpense}
      onDeleteRecurring={finance.deleteRecurringExpense}
    />
  );

  return (
    <>
      {finance.loadError ? <CloudErrorBanner message={finance.loadError} /> : null}
      <AppShell
        active={activeTab}
        onNavigate={setActiveTab}
        onAddTransaction={openTransaction}
        onScanReceipt={() => setActiveTab("split-bill")}
        labels={{
          home: t("menu.home"), statistics: t("menu.stats"), splitBill: t("menu.split"), settings: t("menu.settings"),
          actions: isVietnamese ? "Tác vụ nhanh" : "Quick actions",
          addTransaction: t("dashboard.newTransaction"), scanReceipt: isVietnamese ? "Quét hóa đơn" : "Scan receipt", close: t("common.close"),
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            {screen}
          </motion.div>
        </AnimatePresence>
      </AppShell>

      <AppOverlays
        wallets={finance.wallets}
        userName={userName}
        budget={finance.budget}
        newTransaction={{ open: isTransactionOpen, returnFocusTo: transactionReturnFocusRef.current, onOpenChange: setIsTransactionOpen, onAdd: addTransaction }}
        editTransaction={{ open: transactionToEdit !== null, selected: transactionToEdit, onClose: () => setTransactionToEdit(null), onSave: saveTransaction, onDelete: deleteEditedTransaction }}
        addWallet={{ open: isAddWalletOpen, onClose: () => setIsAddWalletOpen(false), onAdd: addWallet }}
        editWallet={{ open: walletToEdit !== null, selected: walletToEdit, onClose: () => setWalletToEdit(null), onSave: saveWallet, onDelete: finance.wallets.length > 1 ? deleteWallet : undefined }}
        savingsGoal={{ open: isAddGoalOpen, onClose: () => setIsAddGoalOpen(false), onAdd: addSavingsGoal }}
        profile={{ open: isProfileOpen, onClose: () => setIsProfileOpen(false), onSave: saveUserName }}
        monthlyBudget={{
          open: isBudgetOpen,
          onClose: () => setIsBudgetOpen(false),
          onSave: async (amount) => { if ((await finance.saveBudget(amount)).ok) setIsBudgetOpen(false); },
        }}
      />
    </>
  );
}

function triggerConfetti() {
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
}

function CloudErrorBanner({ message }: { message: string }) {
  return <div role="alert" className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-xl rounded-2xl border border-[#b42318]/20 bg-white px-4 py-3 text-sm font-medium text-[#8b1e16] shadow-lg">{message}</div>;
}

function WorkspaceLoadingState({ status, error, isVietnamese, onRetry }: { status: "loading" | "ready" | "error"; error: string; isVietnamese: boolean; onRetry: () => void }) {
  if (status !== "error") return <AppLoadingScreen label={isVietnamese ? "Đang đồng bộ không gian tài chính…" : "Syncing your financial workspace…"} />;
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper-canvas)] px-6 text-center text-[var(--paper-ink)]">
      <div className="max-w-sm rounded-3xl border border-[var(--paper-border)] bg-white p-6 shadow-[0_18px_50px_rgba(25,27,23,0.08)]">
        <h1 className="text-lg font-bold">{isVietnamese ? "Chưa thể tải dữ liệu" : "Unable to load your data"}</h1>
        <p className="mt-2 text-sm font-medium text-[var(--paper-muted)]">{error}</p>
        <button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-full bg-[var(--paper-action)] px-5 text-sm font-bold text-white">{isVietnamese ? "Thử lại" : "Try again"}</button>
      </div>
    </main>
  );
}

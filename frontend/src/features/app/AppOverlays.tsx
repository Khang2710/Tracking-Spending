import { useTranslation } from "react-i18next";
import { Modal } from "../../components/common/Modal";
import { MobileFormSheet } from "../../components/mobile/MobileFormSheet";
import type { SavingsGoal, Transaction, Wallet } from "../../types/finance";
import { EditBudgetForm, EditProfileForm } from "../preferences/SettingsForms";
import { ProfileOnboarding } from "../preferences/ProfileOnboarding";
import { AddGoalModal } from "../savings-goals/SavingsGoalsScreen";
import { EditTransactionForm } from "../transactions/EditTransactionForm";
import { NEW_TRANSACTION_FORM_ID, NewTransactionForm } from "../transactions/NewTransactionForm";
import { AddWalletForm, EditWalletForm } from "../wallets/WalletForms";

interface AppOverlaysProps {
  wallets: Wallet[];
  userName: string;
  budget: number;
  newTransaction: {
    open: boolean;
    returnFocusTo: HTMLElement | null;
    onOpenChange: (open: boolean) => void;
    onAdd: (transaction: Omit<Transaction, "id">, walletId?: number) => void;
  };
  editTransaction: {
    open: boolean;
    selected: Transaction | null;
    onClose: () => void;
    onSave: (transaction: Transaction) => void;
    onDelete: (id: number) => void;
  };
  addWallet: { open: boolean; onClose: () => void; onAdd: (wallet: Omit<Wallet, "id">) => void };
  editWallet: { open: boolean; selected: Wallet | null; onClose: () => void; onSave: (wallet: Wallet) => void; onDelete?: (id: number) => void };
  savingsGoal: { open: boolean; onClose: () => void; onAdd: (goal: Omit<SavingsGoal, "id" | "status">) => void };
  profile: { open: boolean; onClose: () => void; onSave: (name: string) => void };
  monthlyBudget: { open: boolean; onClose: () => void; onSave: (budget: number) => void };
}

export function AppOverlays({ wallets, userName, budget, newTransaction, editTransaction, addWallet, editWallet, savingsGoal, profile, monthlyBudget }: AppOverlaysProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <MobileFormSheet
        open={newTransaction.open}
        returnFocusTo={newTransaction.returnFocusTo}
        onOpenChange={newTransaction.onOpenChange}
        title={t("dashboard.newTransaction")}
        closeLabel={t("common.close")}
        description={i18n.language?.startsWith("vi") ? "Thêm khoản chi hoặc thu nhập" : "Add an expense or income transaction"}
        footer={<button type="submit" form={NEW_TRANSACTION_FORM_ID} className="w-full cursor-pointer rounded-xl bg-[var(--paper-ink)] py-3 font-bold text-white transition-all">{t("dashboard.saveTransaction")}</button>}
      >
        <NewTransactionForm wallets={wallets} onSubmit={newTransaction.onAdd} />
      </MobileFormSheet>

      <Modal isOpen={editTransaction.open} onClose={editTransaction.onClose} title={t("dashboard.editTransaction")}>
        {editTransaction.selected ? <EditTransactionForm transaction={editTransaction.selected} wallets={wallets} onSave={editTransaction.onSave} onDelete={editTransaction.onDelete} /> : null}
      </Modal>

      <Modal isOpen={addWallet.open} onClose={addWallet.onClose} title={t("dashboard.activeWallets")}>
        <AddWalletForm onAdd={addWallet.onAdd} />
      </Modal>

      <Modal isOpen={editWallet.open} onClose={editWallet.onClose} title={`Edit Wallet: ${editWallet.selected?.label}`}>
        {editWallet.selected ? <EditWalletForm wallet={editWallet.selected} onSave={editWallet.onSave} onDelete={editWallet.onDelete} /> : null}
      </Modal>

      <Modal isOpen={savingsGoal.open} onClose={savingsGoal.onClose} title="Tạo hũ tiết kiệm">
        <AddGoalModal onAdd={savingsGoal.onAdd} />
      </Modal>

      <Modal isOpen={profile.open} onClose={profile.onClose} title="Edit Profile">
        <EditProfileForm initialName={userName} onSave={profile.onSave} />
      </Modal>

      <Modal isOpen={monthlyBudget.open} onClose={monthlyBudget.onClose} title="Edit Monthly Budget">
        <EditBudgetForm initialBudget={budget} onSave={monthlyBudget.onSave} />
      </Modal>

      <ProfileOnboarding open={!userName} onComplete={profile.onSave} />
    </>
  );
}

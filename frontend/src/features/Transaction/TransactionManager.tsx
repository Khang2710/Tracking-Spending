import { useTranslation } from "react-i18next";
import { Drawer } from "vaul";
import { C, Modal } from "../../App";
import { AddTransactionForm, EditTransactionForm } from "./TransactionForm";
import type { Wallet, Transaction } from "../../App";

export type TransactionDialog =
  | { mode: "add" }
  | { mode: "edit"; tx: Transaction }
  | null;

interface TransactionManagerProps {
  wallets: Wallet[];
  dialog: TransactionDialog;
  onDialogClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, "id">, walletId: number) => void;
  onSaveTxEdit: (updatedTx: Transaction) => void;
  onDeleteTransaction: (id: number) => void;
}

export default function TransactionManager({
  wallets,
  dialog,
  onDialogClose,
  onAddTransaction,
  onSaveTxEdit,
  onDeleteTransaction,
}: TransactionManagerProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Add Transaction Drawer (Vaul iOS-style Bottom Sheet) */}
      <Drawer.Root open={dialog?.mode === "add"} onOpenChange={(open) => { if (!open) onDialogClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[32px] border-t outline-none font-sans max-h-[90vh]" style={{ background: C.card, borderColor: C.border }}>
            {/* Drag Handle */}
            <div className="mx-auto w-12 h-1.5 rounded-full my-3 bg-white/20" />
            
            {/* Content Container */}
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Drawer.Title className="text-[18px] font-bold text-white">
                  {t("dashboard.newTransaction", "Thêm giao dịch")}
                </Drawer.Title>
                <Drawer.Description className="sr-only">Add a new expense or income transaction</Drawer.Description>
                <button
                  onClick={onDialogClose}
                  className="text-[13px] font-medium text-tm hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {t("common.close", "Đóng")}
                </button>
              </div>
              <AddTransactionForm wallets={wallets} onAdd={onAddTransaction} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={dialog?.mode === "edit"}
        onClose={onDialogClose}
        title={t("dashboard.editTransaction", "Chỉnh sửa giao dịch")}
      >
        {dialog?.mode === "edit" && (
          <EditTransactionForm
            transaction={dialog.tx}
            wallets={wallets}
            onSave={onSaveTxEdit}
            onDelete={(id) => {
              onDeleteTransaction(id);
              onDialogClose();
            }}
          />
        )}
      </Modal>
    </>
  );
}
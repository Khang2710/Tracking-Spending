import { useState } from "react";
import { useTranslation } from "react-i18next";
import { C, Modal } from "../../App";
import type { Wallet } from "../../App";

export type WalletDialog = { mode: "add" } | { mode: "edit"; wallet: Wallet } | null;

interface WalletManagerProps {
  wallets: Wallet[];
  setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>;
  dialog: WalletDialog;
  onDialogClose: () => void;
}

export default function WalletManager({
  wallets,
  setWallets,
  dialog,
  onDialogClose,
}: WalletManagerProps) {
  const { t } = useTranslation();

  const handleAddWallet = (newWallet: Omit<Wallet, "id">) => {
    const nextId = Math.max(0, ...wallets.map((w) => w.id)) + 1;
    setWallets((prev) => [...prev, { ...newWallet, id: nextId }]);
    onDialogClose();
  };

  const handleSaveWallet = (updatedWallet: Wallet) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === updatedWallet.id ? updatedWallet : w))
    );
    onDialogClose();
  };

  const handleDeleteWallet = (walletId: number) => {
    setWallets((prev) => prev.filter((w) => w.id !== walletId));
    onDialogClose();
  };

  return (
    <>
      {/* Add Wallet Modal */}
      <Modal isOpen={dialog?.mode === "add"} onClose={onDialogClose} title={t("dashboard.activeWallets", "Tạo ví mới")}>
        <AddWalletForm onAdd={handleAddWallet} />
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal
        isOpen={dialog?.mode === "edit"}
        onClose={onDialogClose}
        title={`Edit Wallet: ${dialog?.mode === "edit" ? dialog.wallet.label : ""}`}
      >
        {dialog?.mode === "edit" && (
          <EditWalletForm
            wallet={dialog.wallet}
            onSave={handleSaveWallet}
            onDelete={wallets.length > 1 ? handleDeleteWallet : undefined}
          />
        )}
      </Modal>
    </>
  );
}

function AddWalletForm({
  onAdd,
}: {
  onAdd: (wallet: Omit<Wallet, "id">) => void;
}) {
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("");
  const [accent, setAccent] = useState<string>(C.purple);

  const colors = [
    { label: "Purple", value: C.purple },
    { label: "Green", value: C.green },
    { label: "Gold", value: C.gold },
    { label: "Red", value: C.red },
    { label: "Blue", value: "#3B82F6" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !balance) return;
    const numBal = parseFloat(balance);
    if (isNaN(numBal) || numBal < 0) return;

    onAdd({
      label,
      balance: numBal,
      accent,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Wallet Name / Label</label>
        <input
          type="text"
          required
          placeholder="e.g. Card 5678 or Travel Cash"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Initial Balance ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Accent Color</label>
        <div className="flex gap-3 py-1">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAccent(c.value)}
              className="w-7 h-7 rounded-full transition-transform relative flex items-center justify-center cursor-pointer"
              style={{ background: c.value }}
            >
              {accent === c.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-white block" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 mt-2 rounded-xl font-bold transition-all cursor-pointer"
        style={{ background: C.gold, color: C.bg }}
      >
        Create Wallet
      </button>
    </form>
  );
}

function EditWalletForm({
  wallet,
  onSave,
  onDelete,
}: {
  wallet: Wallet;
  onSave: (updated: Wallet) => void;
  onDelete?: (id: number) => void;
}) {
  const [label, setLabel] = useState(wallet.label);
  const [balance, setBalance] = useState(wallet.balance.toString());
  const [accent, setAccent] = useState(wallet.accent);

  const colors = [
    { label: "Purple", value: C.purple },
    { label: "Green", value: C.green },
    { label: "Gold", value: C.gold },
    { label: "Red", value: C.red },
    { label: "Blue", value: "#3B82F6" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !balance) return;
    const numBal = parseFloat(balance);
    if (isNaN(numBal)) return;

    onSave({
      ...wallet,
      label,
      balance: numBal,
      accent,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-white">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Wallet Name / Label</label>
        <input
          type="text"
          required
          placeholder="e.g. Card 5678 or Travel Cash"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Balance ($)</label>
        <input
          type="number"
          step="0.01"
          required
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none border text-white bg-surf"
          style={{ borderColor: C.border }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-tm font-medium">Accent Color</label>
        <div className="flex gap-3 py-1">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAccent(c.value)}
              className="w-7 h-7 rounded-full transition-transform relative flex items-center justify-center cursor-pointer"
              style={{ background: c.value }}
            >
              {accent === c.value && (
                <span className="w-2.5 h-2.5 rounded-full bg-white block" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(wallet.id)}
            className="flex-1 py-3 rounded-xl font-bold border border-solid border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/10 cursor-pointer bg-transparent transition-colors"
          >
            Delete
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl font-bold transition-all cursor-pointer"
          style={{ background: C.gold, color: C.bg }}
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
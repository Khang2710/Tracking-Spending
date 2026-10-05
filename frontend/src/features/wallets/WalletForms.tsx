import { useState } from "react";
import { MoneyInput } from "../../components/forms/MoneyInput";
import { useCurrency } from "../../context/CurrencyContext";
import { toDisplayedAmount, toStoredAmount } from "../../context/currencyAmounts";
import { C } from "../../design/tokens";
import type { Wallet } from "../../types/finance";

export function AddWalletForm({
  onAdd,
}: {
  onAdd: (wallet: Omit<Wallet, "id">) => void;
}) {
  const [label, setLabel] = useState("");
  const { currency } = useCurrency();
  const [balance, setBalance] = useState<number | null>(null);
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
    if (!label || balance === null || !Number.isFinite(balance) || balance < 0) return;

    onAdd({
      label,
      balance: toStoredAmount(balance, currency),
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
        <label className="text-xs text-tm font-medium">Initial Balance ({currency})</label>
        <MoneyInput
          required
          requiredAmount
          placeholder="0"
          value={balance}
          onValueChange={setBalance}
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

export function EditWalletForm({
  wallet,
  onSave,
  onDelete,
}: {
  wallet: Wallet;
  onSave: (updated: Wallet) => void;
  onDelete?: (id: number) => void;
}) {
  const { currency } = useCurrency();
  const [label, setLabel] = useState(wallet.label);
  const [balance, setBalance] = useState<number | null>(() => toDisplayedAmount(wallet.balance, currency));
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
    if (!label || balance === null || !Number.isFinite(balance)) return;

    onSave({
      ...wallet,
      label,
      balance: toStoredAmount(balance, currency),
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
        <label className="text-xs text-tm font-medium">Balance ({currency})</label>
        <MoneyInput
          required
          requiredAmount
          placeholder="0"
          value={balance}
          onValueChange={setBalance}
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





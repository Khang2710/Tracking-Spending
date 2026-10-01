import { Plus, ScanLine } from "lucide-react";

export function QuickActions({
  onAddTransaction,
  onScanReceipt,
  addLabel,
  scanLabel,
}: {
  onAddTransaction: () => void;
  onScanReceipt: () => void;
  addLabel: string;
  scanLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Quick actions">
      <button type="button" onClick={onAddTransaction} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--paper-action)] px-3 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(23,26,22,0.14)] transition-colors duration-200 hover:bg-[#292D27]">
        <Plus size={18} aria-hidden="true" />
        {addLabel}
      </button>
      <button type="button" onClick={onScanReceipt} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--paper-border)] bg-white px-3 text-[13px] font-bold text-[var(--paper-ink)] transition-colors duration-200 hover:bg-[var(--paper-sage-soft)]">
        <ScanLine size={18} aria-hidden="true" />
        {scanLabel}
      </button>
    </div>
  );
}

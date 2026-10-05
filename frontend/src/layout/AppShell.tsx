import { useRef, useState, type ReactNode } from "react";
import { Plus, ScanLine, X } from "lucide-react";
import type { AppDestination, NavigationLabels } from "./navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppShell({
  active,
  onNavigate,
  onAddTransaction,
  onScanReceipt,
  labels,
  children,
}: {
  active: AppDestination;
  onNavigate: (destination: AppDestination) => void;
  onAddTransaction: (returnFocusTo?: HTMLElement | null) => void;
  onScanReceipt: () => void;
  labels: NavigationLabels;
  children: ReactNode;
}) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);

  const runAction = (action: () => void) => {
    setIsActionMenuOpen(false);
    action();
  };

  return (
    <div className="paper-ledger min-h-[100dvh] w-full overflow-x-hidden">
      <DesktopSidebar active={active} labels={labels} onNavigate={onNavigate} />
      <div className="min-h-[100dvh] md:pl-[220px]">{children}</div>
      <MobileBottomNav active={active} labels={labels} onNavigate={onNavigate} onOpenActions={() => setIsActionMenuOpen(true)} actionsTriggerRef={actionsTriggerRef} />

      {isActionMenuOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171A16]/35 p-3 backdrop-blur-[2px] md:items-center" role="presentation" onMouseDown={() => setIsActionMenuOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label={labels.actions} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-[26px] border border-white/70 bg-[var(--paper-surface)] p-4 shadow-[0_30px_80px_rgba(23,26,22,0.25)]">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[18px] font-extrabold tracking-[-0.025em]">{labels.actions}</h2>
              <button type="button" onClick={() => setIsActionMenuOpen(false)} aria-label={labels.close} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-sage-soft)] text-[var(--paper-muted)]"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="grid gap-2">
              <button type="button" onClick={() => runAction(() => onAddTransaction(actionsTriggerRef.current))} className="flex min-h-14 items-center gap-3 rounded-[18px] bg-[var(--paper-action)] px-4 text-left text-[14px] font-bold text-white"><Plus size={19} aria-hidden="true" />{labels.addTransaction}</button>
              <button type="button" onClick={() => runAction(onScanReceipt)} className="flex min-h-14 items-center gap-3 rounded-[18px] border border-[var(--paper-border)] bg-[var(--paper-sage-soft)] px-4 text-left text-[14px] font-bold text-[var(--paper-ink)]"><ScanLine size={19} aria-hidden="true" />{labels.scanReceipt}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

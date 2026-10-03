import { BarChart3, HandCoins, Home, Plus, Settings } from "lucide-react";
import type { Ref } from "react";
import type { AppDestination, NavigationLabels } from "./navigation";

export function MobileBottomNav({ active, labels, onNavigate, onOpenActions, actionsTriggerRef }: { active: AppDestination; labels: NavigationLabels; onNavigate: (destination: AppDestination) => void; onOpenActions: () => void; actionsTriggerRef?: Ref<HTMLButtonElement> }) {
  const navButton = (destination: AppDestination, label: string, Icon: typeof Home) => {
    const isActive = active === destination;
    return (
      <button type="button" aria-current={isActive ? "page" : undefined} onClick={() => onNavigate(destination)} className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-bold transition-colors ${isActive ? "text-[var(--paper-ink)]" : "text-[var(--paper-subtle)]"}`}>
        <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <nav aria-label="Điều hướng di động" className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 right-3 z-40 grid grid-cols-5 items-center rounded-[24px] border border-white/80 bg-white/92 px-2 py-2 shadow-[0_18px_50px_rgba(42,45,39,0.18)] backdrop-blur-xl md:hidden">
      {navButton("home", labels.home, Home)}
      {navButton("statistics", labels.statistics, BarChart3)}
      <button ref={actionsTriggerRef} type="button" onClick={onOpenActions} aria-label={labels.actions} className="mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full border-[5px] border-[var(--paper-canvas)] bg-[var(--paper-action)] text-white shadow-[0_12px_26px_rgba(23,26,22,0.25)] transition-transform duration-200 active:translate-y-[-14px]">
        <Plus size={23} strokeWidth={2.3} aria-hidden="true" />
      </button>
      {navButton("split-bill", labels.splitBill, HandCoins)}
      {navButton("settings", labels.settings, Settings)}
    </nav>
  );
}

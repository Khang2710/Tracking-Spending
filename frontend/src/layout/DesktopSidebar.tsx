import { BarChart3, HandCoins, Home, Settings } from "lucide-react";
import type { AppDestination, NavigationLabels } from "./navigation";

const destinations = [
  { id: "home", icon: Home, labelKey: "home" },
  { id: "statistics", icon: BarChart3, labelKey: "statistics" },
  { id: "split-bill", icon: HandCoins, labelKey: "splitBill" },
  { id: "settings", icon: Settings, labelKey: "settings" },
] as const;

export function DesktopSidebar({ active, labels, onNavigate }: { active: AppDestination; labels: NavigationLabels; onNavigate: (destination: AppDestination) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-[var(--paper-border)] bg-[#ECEBE5] px-4 py-6 md:flex md:flex-col">
      <div className="mb-8 flex h-11 items-center gap-2.5 px-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[var(--paper-action)] text-[13px] font-extrabold text-white" aria-hidden="true">F</span>
        <span className="text-[15px] font-extrabold tracking-[-0.035em] text-[var(--paper-ink)]">Financial tracker</span>
      </div>
      <nav aria-label="Điều hướng desktop" className="space-y-1.5">
        {destinations.map(({ id, icon: Icon, labelKey }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(id)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-[15px] px-3.5 text-left text-[13px] font-bold transition-colors duration-200 ${isActive ? "bg-[var(--paper-action)] text-white shadow-[0_8px_20px_rgba(23,26,22,0.12)]" : "text-[var(--paper-muted)] hover:bg-white/75 hover:text-[var(--paper-ink)]"}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
              {labels[labelKey]}
            </button>
          );
        })}
      </nav>
      <p className="mt-auto px-3 text-[10px] font-semibold leading-relaxed text-[var(--paper-subtle)]">Personal finance workspace</p>
    </aside>
  );
}

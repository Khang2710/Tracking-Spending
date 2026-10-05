export interface MonthSelectorProps {
  selected: number;
  onChange: (index: number) => void;
  months: string[];
  year: number;
}

export function MonthSelector({ selected, onChange, months, year }: MonthSelectorProps) {
  return (
    <div className="rounded-[20px] border border-[var(--paper-border)] bg-white p-2 shadow-[0_12px_38px_rgba(42,45,39,0.045)]">
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
        {months.map((month, index) => {
          const active = selected === index;
          return (
            <button
              key={`${month}-${index}`}
              type="button"
              aria-label={`${month} ${year}`}
              aria-pressed={active}
              onClick={() => onChange(index)}
              className={`min-h-11 rounded-[13px] border-0 px-1 text-[12px] font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paper-ink)] focus-visible:ring-offset-2 ${active ? "bg-[var(--paper-ink)] text-white shadow-[0_6px_15px_rgba(23,26,22,0.14)]" : "bg-transparent text-[var(--paper-muted)] hover:bg-[var(--paper-surface)] hover:text-[var(--paper-ink)]"}`}
            >
              <span className="hidden text-[8px] font-semibold opacity-60 lg:block">{year}</span>
              <span>{month}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

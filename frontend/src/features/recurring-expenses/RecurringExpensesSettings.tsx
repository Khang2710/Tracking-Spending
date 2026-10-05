import { useMemo, useState } from "react";
import { CalendarClock, Pause, Play, Plus, Trash2 } from "lucide-react";
import type { Wallet } from "../../types/finance";
import type { RecurringExpense } from "./recurring.types";

interface Props {
  expenses: RecurringExpense[];
  wallets: Wallet[];
  locale: string;
  formatCurrency: (amount: number) => string;
  onAdd: (expense: Omit<RecurringExpense, "id">) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function toIsoDate(dayOfMonth: number) {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let due = new Date(now.getFullYear(), now.getMonth(), Math.min(dayOfMonth, lastDay));
  if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    const nextLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    due = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dayOfMonth, nextLastDay));
  }
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

export function RecurringExpensesSettings({ expenses, wallets, locale, formatCurrency, onAdd, onToggle, onDelete }: Props) {
  const isVi = locale.startsWith("vi");
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [walletId, setWalletId] = useState(String(wallets[0]?.id ?? 1));
  const activeCount = useMemo(() => expenses.filter((expense) => expense.status === "active").length, [expenses]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const expectedAmount = Number(amount);
    const dayOfMonth = Math.min(31, Math.max(1, Number(day)));
    if (!name.trim() || !Number.isFinite(expectedAmount) || expectedAmount <= 0) return;
    onAdd({
      name: name.trim(),
      expectedAmount,
      dayOfMonth,
      nextDueDate: toIsoDate(dayOfMonth),
      walletId: Number(walletId),
      category: "Housing",
      status: "active",
    });
    setName("");
    setAmount("");
    setIsAdding(false);
  };

  return (
    <section className="paper-surface rounded-[24px] p-5 sm:p-6" aria-labelledby="recurring-expenses-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--paper-warning)]"><CalendarClock size={18} aria-hidden="true" /><span className="text-[11px] font-extrabold uppercase tracking-[0.12em]">Financial insights</span></div>
          <h2 id="recurring-expenses-title" className="mt-2 text-lg font-extrabold text-[var(--paper-ink)]">{isVi ? "Khoản chi cố định" : "Recurring expenses"}</h2>
          <p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{isVi ? `${activeCount} khoản đang được nhắc. Chỉ tạo giao dịch sau khi bạn xác nhận.` : `${activeCount} active reminders. Transactions are only created after confirmation.`}</p>
        </div>
        <button type="button" onClick={() => setIsAdding((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--paper-action)] px-4 text-xs font-bold text-white"><Plus size={16} />{isVi ? "Thêm khoản" : "Add expense"}</button>
      </div>

      {isAdding ? (
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[20px] bg-[var(--paper-canvas)] p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold text-[var(--paper-muted)]">{isVi ? "Tên khoản chi" : "Name"}<input value={name} onChange={(event) => setName(event.target.value)} required placeholder={isVi ? "Ví dụ: Tiền nhà" : "e.g. Rent"} className="min-h-11 rounded-xl border border-[var(--paper-border)] bg-white px-3 text-sm text-[var(--paper-ink)] outline-none focus:border-[var(--paper-sage)]" /></label>
          <label className="grid gap-1.5 text-xs font-bold text-[var(--paper-muted)]">{isVi ? "Số tiền" : "Amount"}<input value={amount} onChange={(event) => setAmount(event.target.value)} required min="1" type="number" inputMode="decimal" className="min-h-11 rounded-xl border border-[var(--paper-border)] bg-white px-3 text-sm text-[var(--paper-ink)] outline-none focus:border-[var(--paper-sage)]" /></label>
          <label className="grid gap-1.5 text-xs font-bold text-[var(--paper-muted)]">{isVi ? "Ngày đến hạn hàng tháng" : "Monthly due day"}<input value={day} onChange={(event) => setDay(event.target.value)} min="1" max="31" type="number" className="min-h-11 rounded-xl border border-[var(--paper-border)] bg-white px-3 text-sm text-[var(--paper-ink)] outline-none focus:border-[var(--paper-sage)]" /></label>
          <label className="grid gap-1.5 text-xs font-bold text-[var(--paper-muted)]">{isVi ? "Ví thanh toán" : "Wallet"}<select value={walletId} onChange={(event) => setWalletId(event.target.value)} className="min-h-11 rounded-xl border border-[var(--paper-border)] bg-white px-3 text-sm text-[var(--paper-ink)] outline-none focus:border-[var(--paper-sage)]">{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label}</option>)}</select></label>
          <button type="submit" className="min-h-11 rounded-xl bg-[var(--paper-action)] px-4 text-sm font-bold text-white sm:col-span-2">{isVi ? "Lưu lời nhắc" : "Save reminder"}</button>
        </form>
      ) : null}

      <div className="mt-5 grid gap-3">
        {expenses.length === 0 ? <div className="rounded-[18px] border border-dashed border-[var(--paper-border)] bg-[var(--paper-canvas)] px-4 py-8 text-center text-sm font-semibold text-[var(--paper-muted)]">{isVi ? "Chưa có khoản cố định nào." : "No recurring expenses yet."}</div> : expenses.map((expense) => (
          <article key={expense.id} className="flex items-center gap-3 rounded-[18px] border border-[var(--paper-border)] bg-white p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--paper-sage-soft)] text-[var(--paper-ink)]"><CalendarClock size={19} /></span>
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold text-[var(--paper-ink)]">{expense.name}</h3><p className="mt-1 text-xs font-semibold text-[var(--paper-muted)]">{formatCurrency(expense.expectedAmount)} · {isVi ? `ngày ${expense.dayOfMonth}` : `day ${expense.dayOfMonth}`}</p></div>
            <button type="button" onClick={() => onToggle(expense.id)} aria-label={expense.status === "active" ? (isVi ? `Tạm dừng ${expense.name}` : `Pause ${expense.name}`) : (isVi ? `Bật ${expense.name}` : `Resume ${expense.name}`)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-canvas)] text-[var(--paper-muted)]">{expense.status === "active" ? <Pause size={17} /> : <Play size={17} />}</button>
            <button type="button" onClick={() => onDelete(expense.id)} aria-label={isVi ? `Xóa ${expense.name}` : `Delete ${expense.name}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7ECE8] text-[var(--paper-danger)]"><Trash2 size={17} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

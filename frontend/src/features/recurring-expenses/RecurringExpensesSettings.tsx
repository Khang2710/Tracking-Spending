import { useMemo, useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import type { Wallet } from "../../types/finance";
import { MobileFormSheet } from "../../components/mobile/MobileFormSheet";
import { MoneyInput } from "../../components/forms/MoneyInput";
import { toDisplayedAmount, toStoredAmount, type CurrencyType } from "../../context/currencyAmounts";
import { useCurrency } from "../../context/CurrencyContext";
import { getFirstUpcomingDueDate } from "./recurring.schedule";
import type { RecurringExpense, RecurringFrequency } from "./recurring.types";

interface Props {
  expenses: RecurringExpense[];
  wallets: Wallet[];
  locale: string;
  formatCurrency: (amount: number) => string;
  onAdd: (expense: Omit<RecurringExpense, "id">) => void | boolean | Promise<boolean>;
  onUpdate: (id: string, expense: Omit<RecurringExpense, "id">) => void | boolean | Promise<boolean>;
  onDelete: (id: string) => void | Promise<void>;
}

type FormState = { name: string; amount: number | null; frequency: RecurringFrequency; weekday: number; dayOfMonth: number; monthOfYear: number; startDate: string; walletId: number; category: string };

const categories = ["Food", "Drinks", "Groceries", "Shopping", "Fuel", "Housing", "Entertainment", "Salary", "Bank", "Investment", "Others"];
const fieldClassName = "min-h-11 w-full rounded-xl border border-[var(--paper-border)] bg-[var(--paper-canvas)] px-3 text-base text-[var(--paper-ink)] outline-none focus:border-[var(--paper-ink)]";
const labelClassName = "grid gap-1.5 text-xs font-semibold text-[var(--paper-muted)]";

function localDateToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function buildInitialForm(wallets: Wallet[], currency: CurrencyType, expense?: RecurringExpense): FormState {
  return {
    name: expense?.name ?? "", amount: expense ? toDisplayedAmount(expense.expectedAmount, currency) : null,
    frequency: expense?.frequency ?? "monthly", weekday: expense?.weekday ?? 1, dayOfMonth: expense?.dayOfMonth ?? 1,
    monthOfYear: expense?.monthOfYear ?? new Date().getMonth() + 1, startDate: expense?.startDate ?? localDateToday(),
    walletId: expense?.walletId || wallets[0]?.id || 0, category: expense?.category ?? "Housing",
  };
}

export function RecurringExpensesSettings({ expenses, wallets, locale, formatCurrency, onAdd, onUpdate, onDelete }: Props) {
  const isVi = locale.startsWith("vi");
  const { currency } = useCurrency();
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialForm(wallets, currency));
  const activeCount = useMemo(() => expenses.filter((expense) => expense.status === "active").length, [expenses]);
  const weekdayLabels = isVi ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthLabels = isVi ? ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"] : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const openCreate = () => { setEditingExpense(null); setForm(buildInitialForm(wallets, currency)); setIsEditorOpen(true); };
  const openEdit = (expense: RecurringExpense) => { setEditingExpense(expense); setForm(buildInitialForm(wallets, currency, expense)); setIsEditorOpen(true); };
  const closeEditor = () => { setIsSaving(false); setIsEditorOpen(false); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = form.amount ?? 0;
    if (!form.name.trim() || amount <= 0 || !Number.isFinite(amount) || !form.walletId) return;
    const expense: Omit<RecurringExpense, "id"> = {
      name: form.name.trim(), expectedAmount: toStoredAmount(amount, currency), frequency: form.frequency,
      weekday: form.frequency === "weekly" ? form.weekday : undefined, dayOfMonth: form.dayOfMonth,
      monthOfYear: form.frequency === "yearly" ? form.monthOfYear : undefined, startDate: form.startDate,
      nextDueDate: getFirstUpcomingDueDate({ frequency: form.frequency, weekday: form.weekday, dayOfMonth: form.dayOfMonth, monthOfYear: form.monthOfYear, startDate: form.startDate }),
      walletId: form.walletId, category: form.category, status: editingExpense?.status ?? "active",
    };
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await (editingExpense ? onUpdate(editingExpense.id, expense) : onAdd(expense));
      // Existing callers that return void retain the legacy close-on-save behavior;
      // cloud saves explicitly return false on failure so the user can correct and retry.
      if (saved !== false) closeEditor();
    } finally {
      setIsSaving(false);
    }
  };

  return <section className="paper-surface rounded-[24px] p-5 sm:p-6" aria-labelledby="recurring-expenses-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[var(--paper-warning)]"><CalendarClock size={18} aria-hidden="true" /><span className="text-[11px] font-extrabold uppercase tracking-[0.12em]">{isVi ? "Thông tin tài chính" : "Financial insights"}</span></div><h2 id="recurring-expenses-title" className="mt-2 text-lg font-extrabold text-[var(--paper-ink)]">{isVi ? "Khoản chi định kỳ" : "Recurring expenses"}</h2><p className="mt-1 text-xs font-medium text-[var(--paper-muted)]">{isVi ? `${activeCount} khoản đang nhắc. Giao dịch chỉ được tạo sau khi bạn xác nhận.` : `${activeCount} active reminders. Transactions are only created after confirmation.`}</p></div><button type="button" onClick={openCreate} aria-label={isVi ? "Thêm khoản chi định kỳ" : "Add recurring expense"} className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--paper-action)] px-4 text-xs font-bold text-white"><Plus size={16} aria-hidden="true" />{isVi ? "Thêm khoản" : "Add expense"}</button></div>
    <div className="mt-5 grid gap-3">{expenses.length === 0 ? <div className="rounded-[18px] border border-dashed border-[var(--paper-border)] bg-[var(--paper-canvas)] px-4 py-8 text-center text-sm font-semibold text-[var(--paper-muted)]">{isVi ? "Chưa có khoản chi định kỳ nào." : "No recurring expenses yet."}</div> : expenses.map((expense) => {
      const walletLabel = wallets.find((wallet) => wallet.id === expense.walletId)?.label;
      const scheduleLabel = expense.frequency === "weekly" ? weekdayLabels[(expense.weekday ?? 1) - 1] : expense.frequency === "yearly" ? `${monthLabels[(expense.monthOfYear ?? 1) - 1]} ${expense.dayOfMonth}` : `${isVi ? "ngày" : "day"} ${expense.dayOfMonth}`;
      return <article key={expense.id} className="flex items-center gap-3 rounded-[18px] border border-[var(--paper-border)] bg-white p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--paper-sage-soft)] text-[var(--paper-ink)]"><CalendarClock size={19} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold text-[var(--paper-ink)]">{expense.name}</h3><p className="mt-1 text-xs font-semibold text-[var(--paper-muted)]">{formatCurrency(expense.expectedAmount)} · {scheduleLabel}{walletLabel ? ` · ${walletLabel}` : ` · ${isVi ? "Ví đã bị xóa" : "Wallet removed"}`}</p></div><button type="button" onClick={() => openEdit(expense)} aria-label={isVi ? `Sửa ${expense.name}` : `Edit ${expense.name}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper-canvas)] text-[var(--paper-muted)]"><Pencil size={17} aria-hidden="true" /></button><button type="button" onClick={() => { if (window.confirm(isVi ? `Xóa khoản chi định kỳ “${expense.name}”?` : `Delete recurring expense “${expense.name}”?`)) void onDelete(expense.id); }} aria-label={isVi ? `Xóa ${expense.name}` : `Delete ${expense.name}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7ECE8] text-[var(--paper-danger)]"><Trash2 size={17} aria-hidden="true" /></button></article>;
    })}</div>
    <MobileFormSheet open={isEditorOpen} onOpenChange={(open) => { if (!open && !isSaving) closeEditor(); }} title={editingExpense ? (isVi ? "Sửa khoản chi" : "Edit recurring expense") : (isVi ? "Thêm khoản chi" : "Add recurring expense")} description={isVi ? "Chỉ tạo giao dịch khi bạn xác nhận khoản này đã thanh toán." : "A transaction is created only after you confirm this expense was paid."} closeLabel={isVi ? "Đóng" : "Close"} footer={<button type="submit" form="recurring-expense-form" disabled={isSaving} aria-busy={isSaving} className="w-full rounded-xl bg-[var(--paper-ink)] py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{isSaving ? (isVi ? "Đang lưu…" : "Saving…") : editingExpense ? (isVi ? "Lưu thay đổi" : "Save changes") : (isVi ? "Lưu khoản chi" : "Save expense")}</button>}>
      <form id="recurring-expense-form" onSubmit={submit} className="grid gap-4 pb-1 text-sm text-[var(--paper-ink)]">
        <label className={labelClassName}>{isVi ? "Tên khoản chi" : "Expense name"}<input type="text" required maxLength={160} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={isVi ? "Ví dụ: Tiền nhà" : "e.g. Rent"} className={fieldClassName} /></label>
        <label className={labelClassName}>{isVi ? `Số tiền (${currency})` : `Amount (${currency})`}<MoneyInput value={form.amount} onValueChange={(amount) => setForm((current) => ({ ...current, amount }))} requiredAmount placeholder="0" aria-label={isVi ? "Số tiền" : "Amount"} className={fieldClassName} /></label>
        <fieldset className="grid gap-2"><legend className="text-xs font-semibold text-[var(--paper-muted)]">{isVi ? "Lịch lặp" : "Repeats"}</legend><div className="grid grid-cols-3 gap-2">{(["weekly", "monthly", "yearly"] as const).map((frequency) => <button key={frequency} type="button" aria-pressed={form.frequency === frequency} onClick={() => setForm((current) => ({ ...current, frequency }))} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${form.frequency === frequency ? "border-[var(--paper-ink)] bg-[var(--paper-ink)] text-white" : "border-[var(--paper-border)] bg-white text-[var(--paper-muted)]"}`}>{frequency === "weekly" ? (isVi ? "Hàng tuần" : "Weekly") : frequency === "monthly" ? (isVi ? "Hàng tháng" : "Monthly") : (isVi ? "Hàng năm" : "Yearly")}</button>)}</div></fieldset>
        {form.frequency === "weekly" ? <fieldset className="grid gap-2"><legend className="text-xs font-semibold text-[var(--paper-muted)]">{isVi ? "Ngày trong tuần" : "Day of week"}</legend><div className="grid grid-cols-7 gap-1.5">{weekdayLabels.map((label, index) => <button key={label} type="button" aria-pressed={form.weekday === index + 1} onClick={() => setForm((current) => ({ ...current, weekday: index + 1 }))} className={`min-h-11 rounded-xl text-xs font-bold ${form.weekday === index + 1 ? "bg-[var(--paper-sage)] text-white" : "bg-[var(--paper-canvas)] text-[var(--paper-muted)]"}`}>{label}</button>)}</div></fieldset> : <fieldset className="grid gap-2"><legend className="text-xs font-semibold text-[var(--paper-muted)]">{isVi ? "Ngày đến hạn" : "Due day"}</legend><div className="grid grid-cols-7 gap-1.5">{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <button key={day} type="button" aria-pressed={form.dayOfMonth === day} onClick={() => setForm((current) => ({ ...current, dayOfMonth: day }))} className={`min-h-10 rounded-lg text-xs font-bold ${form.dayOfMonth === day ? "bg-[var(--paper-sage)] text-white" : "bg-[var(--paper-canvas)] text-[var(--paper-muted)]"}`}>{day}</button>)}</div><p className="text-[11px] font-medium text-[var(--paper-muted)]">{isVi ? "Ngày 29–31 sẽ dùng ngày cuối cùng hợp lệ của tháng." : "Days 29–31 use the last valid day of shorter months."}</p></fieldset>}
        {form.frequency === "yearly" ? <label className={labelClassName}>{isVi ? "Tháng đến hạn" : "Due month"}<select value={form.monthOfYear} onChange={(event) => setForm((current) => ({ ...current, monthOfYear: Number(event.target.value) }))} className={fieldClassName}>{monthLabels.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label> : null}
        <label className={labelClassName}>{isVi ? "Ngày bắt đầu" : "Start date"}<input type="date" required value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className={fieldClassName} /></label>
        <div className="grid grid-cols-2 gap-3"><label className={labelClassName}>{isVi ? "Danh mục" : "Category"}<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={fieldClassName}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className={labelClassName}>{isVi ? "Ví" : "Wallet"}<select value={form.walletId} required onChange={(event) => setForm((current) => ({ ...current, walletId: Number(event.target.value) }))} className={fieldClassName}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.label}</option>)}</select></label></div>
      </form>
    </MobileFormSheet>
  </section>;
}

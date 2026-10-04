import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyProvider } from "../../context/CurrencyContext";
import { RecurringExpensesSettings } from "./RecurringExpensesSettings";

vi.mock("../../components/mobile/MobileFormSheet", () => ({
  MobileFormSheet: ({ open, children, footer, title }: { open: boolean; children: ReactNode; footer: ReactNode; title: string }) => open ? <section role="dialog" aria-label={title}>{children}{footer}</section> : null,
}));

const wallets = [{ id: 1, label: "Cash", balance: 1_000_000, accent: "#111" }];

describe("RecurringExpensesSettings", () => {
  it("stores a USD entry in the canonical amount and exposes accessible weekly and monthly controls", () => {
    localStorage.setItem("wealthy_currency", "USD");
    const onAdd = vi.fn();
    render(<CurrencyProvider><RecurringExpensesSettings expenses={[]} wallets={wallets} locale="en-US" formatCurrency={(value) => `$${value}`} onAdd={onAdd} onUpdate={vi.fn()} onDelete={vi.fn()} /></CurrencyProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Add recurring expense" }));
    fireEvent.change(screen.getByLabelText("Expense name"), { target: { value: "Rent" } });
    const amount = screen.getByLabelText("Amount");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "16" } });
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    fireEvent.click(screen.getByRole("button", { name: "31" }));
    fireEvent.submit(document.querySelector("#recurring-expense-form")!);

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Rent", expectedAmount: 400_000, frequency: "monthly", dayOfMonth: 31 }));
  });
});

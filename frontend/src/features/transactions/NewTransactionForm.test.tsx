import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "../../App";
import { MobileFormSheet } from "../../components/mobile/MobileFormSheet";
import { CurrencyProvider } from "../../context/CurrencyContext";
import en from "../../locales/en";
import { NEW_TRANSACTION_FORM_ID, NewTransactionForm } from "./NewTransactionForm";

const wallets: Wallet[] = [
  { id: 3, label: "Cash", balance: 250_000, accent: "#746783" },
  { id: 8, label: "Bank", balance: 500_000, accent: "#4F7D62" },
];

async function renderForm() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } } });
  const onSubmit = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <CurrencyProvider>
        <MobileFormSheet
          open
          onOpenChange={vi.fn()}
          title="New Transaction"
          closeLabel="Close"
          description="Add an expense or income"
          footer={<button type="submit" form={NEW_TRANSACTION_FORM_ID}>Save Transaction</button>}
        >
          <NewTransactionForm wallets={wallets} onSubmit={onSubmit} />
        </MobileFormSheet>
      </CurrencyProvider>
    </I18nextProvider>,
  );
  return { user: userEvent.setup(), onSubmit };
}

describe("NewTransactionForm", () => {
  beforeEach(() => localStorage.clear());

  it("renders the core inputs and keeps the note collapsed", async () => {
    await renderForm();

    expect(screen.getByLabelText("Description")).toBeRequired();
    expect(screen.getByLabelText("Amount")).toBeRequired();
    expect(screen.getByLabelText("Category")).toHaveValue("Others");
    expect(screen.getByLabelText("Transaction date")).toBeRequired();
    expect(screen.getByLabelText("Wallet")).toHaveValue("3");
    expect(screen.getByRole("button", { name: /add note/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: "Note" })).not.toBeInTheDocument();
  });

  it("links the sheet footer Save action to the form", async () => {
    await renderForm();
    const save = screen.getByRole("button", { name: /save transaction/i });
    const form = screen.getByLabelText("Description").closest("form");

    expect(save.closest("footer")).not.toBeNull();
    expect(form).toHaveAttribute("id", NEW_TRANSACTION_FORM_ID);
    expect(form).not.toContainElement(save);
    expect(save).toHaveAttribute("form", NEW_TRANSACTION_FORM_ID);
  });

  it("submits an expanded note with the selected wallet and ISO date", async () => {
    const { user, onSubmit } = await renderForm();
    await user.type(screen.getByLabelText("Description"), "Taxi");
    await user.type(screen.getByLabelText("Amount"), "45000");
    await user.selectOptions(screen.getByLabelText("Wallet"), "8");
    await user.clear(screen.getByLabelText("Transaction date"));
    await user.type(screen.getByLabelText("Transaction date"), "2026-09-29");
    await user.click(screen.getByRole("button", { name: /add note/i }));
    expect(screen.getByRole("button", { name: /note/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Note")).toHaveAttribute("maxlength", "500");
    await user.type(screen.getByLabelText("Note"), "Taxi home");
    await user.click(screen.getByRole("button", { name: /save transaction/i }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: "Taxi", amount: -45000, category: "Fuel", date: "2026-09-29", walletId: 8, note: "Taxi home",
    });
  });

  it("submits null when the note was never opened", async () => {
    const { user, onSubmit } = await renderForm();
    await user.type(screen.getByLabelText("Description"), "Lunch");
    await user.type(screen.getByLabelText("Amount"), "35000");
    await user.click(screen.getByRole("button", { name: /save transaction/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Lunch", amount: -35000, category: "Food", walletId: 3, note: null }));
  });

  it("keeps a manual category selection when the description changes", async () => {
    const { user, onSubmit } = await renderForm();
    await user.type(screen.getByLabelText("Description"), "Lunch");
    await user.selectOptions(screen.getByLabelText("Category"), "Shopping");
    await user.type(screen.getByLabelText("Description"), " and coffee");
    await user.type(screen.getByLabelText("Amount"), "10000");
    await user.click(screen.getByRole("button", { name: /save transaction/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ category: "Shopping" }));
  });

  it("converts income entered in USD to the stored VND amount", async () => {
    localStorage.setItem("wealthy_currency", "USD");
    const { user, onSubmit } = await renderForm();
    await user.click(screen.getByRole("button", { name: "Income" }));
    await user.type(screen.getByLabelText("Description"), "Salary");
    await user.type(screen.getByLabelText("Amount"), "12.50");
    await user.click(screen.getByRole("button", { name: /save transaction/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 312500, category: "Salary" }));
  });

  it("does not submit missing or nonpositive core values", async () => {
    const { user, onSubmit } = await renderForm();
    await user.click(screen.getByRole("button", { name: /save transaction/i }));
    await user.type(screen.getByLabelText("Description"), "Lunch");
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.click(screen.getByRole("button", { name: /save transaction/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

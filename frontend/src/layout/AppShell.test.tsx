import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useRef, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { MobileFormSheet } from "../components/mobile/MobileFormSheet";
import { CurrencyProvider } from "../context/CurrencyContext";
import { NewTransactionForm } from "../features/transactions/NewTransactionForm";
import en from "../locales/en";
import viLocale from "../locales/vi";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("offers four destinations and keeps the center action separate", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onAddTransaction = vi.fn();
    render(
      <AppShell
        active="home"
        onNavigate={onNavigate}
        onAddTransaction={onAddTransaction}
        onScanReceipt={vi.fn()}
        labels={{ home: "Trang chủ", statistics: "Thống kê", splitBill: "Chia bill", settings: "Cài đặt", actions: "Mở tác vụ nhanh", addTransaction: "Thêm giao dịch", scanReceipt: "Quét hóa đơn", close: "Đóng" }}
      >
        <p>Nội dung</p>
      </AppShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Điều hướng di động" });
    expect(within(mobileNav).getAllByRole("button")).toHaveLength(5);
    await user.click(within(mobileNav).getByRole("button", { name: "Mở tác vụ nhanh" }));
    await user.click(screen.getByRole("button", { name: "Thêm giao dịch" }));

    expect(onAddTransaction).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalledWith("actions");
  });

  it.each([
    { language: "en", actions: "Quick actions", transaction: "New Transaction", close: "Close", description: "Description" },
    { language: "vi", actions: "Tác vụ nhanh", transaction: "Thêm giao dịch", close: "Đóng", description: "Mô tả / Tên giao dịch" },
  ])("returns focus to the $language launcher after closing New Transaction", async ({ language, actions, transaction, close, description }) => {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({ lng: language, resources: { en: { translation: en }, vi: { translation: viLocale } } });
    const onSubmit = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      const returnFocusRef = useRef<HTMLElement | null>(null);
      return (
        <>
          <AppShell
            active="home"
            onNavigate={vi.fn()}
            onAddTransaction={(target?: HTMLElement | null) => { returnFocusRef.current = target ?? null; setOpen(true); }}
            onScanReceipt={vi.fn()}
            labels={{ home: "Home", statistics: "Statistics", splitBill: "Split bill", settings: "Settings", actions, addTransaction: transaction, scanReceipt: "Scan receipt", close }}
          ><p>Home content</p></AppShell>
          <MobileFormSheet open={open} onOpenChange={setOpen} returnFocusTo={returnFocusRef.current} title={transaction} description="Add transaction" closeLabel={close}>
            <NewTransactionForm wallets={[]} onSubmit={onSubmit} />
          </MobileFormSheet>
        </>
      );
    }
    render(<I18nextProvider i18n={i18n}><CurrencyProvider><Harness /></CurrencyProvider></I18nextProvider>);
    const user = userEvent.setup();
    const launcher = screen.getByRole("button", { name: actions });
    await user.click(launcher);
    await user.click(screen.getByRole("button", { name: transaction }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: description })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: close }));
    await waitFor(() => expect(launcher).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

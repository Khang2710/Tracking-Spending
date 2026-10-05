import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
});

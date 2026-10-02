import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import { CurrencyProvider } from "../../context/CurrencyContext";
import { HomeScreen } from "./HomeScreen";

const callbacks = {
  onEditBudget: vi.fn(),
  onAddTransaction: vi.fn(),
  onScanReceipt: vi.fn(),
  onAddWallet: vi.fn(),
  onEditWallet: vi.fn(),
  onEditTransaction: vi.fn(),
  onDeleteTransaction: vi.fn(),
};

function renderHome(overrides: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return render(
    <CurrencyProvider>
      <HomeScreen
        wallets={[
          { id: 1, label: "Ví chính", balance: 8_500_000, accent: "#D9C5A5" },
          { id: 2, label: "Tiền mặt", balance: 1_200_000, accent: "#A9B8A0" },
        ]}
        transactions={[
          { id: 1, name: "Cà phê sáng", date: "2026-09-22", amount: -45_000, category: "Drinks", walletId: 2, note: null },
        ]}
        budget={12_000_000}
        now={new Date(2026, 8, 22)}
        {...callbacks}
        {...overrides}
      />
    </CurrencyProvider>,
  );
}

describe("HomeScreen", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
    vi.clearAllMocks();
  });

  it("starts with the localized date and omits product branding and greeting", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: "Thứ Ba, 22 tháng 9" })).toBeInTheDocument();
    expect(screen.queryByText(/wealthy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chào mừng/i)).not.toBeInTheDocument();
  });

  it("shows semantic wallets without duplicating the center quick actions", () => {
    renderHome();

    expect(screen.getByLabelText("Ví chính: Ví chính")).toBeInTheDocument();
    expect(screen.getByLabelText("Ví tiền mặt: Tiền mặt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quét hóa đơn" })).not.toBeInTheDocument();
  });

  it("makes empty states actionable", async () => {
    const user = userEvent.setup();
    renderHome({ wallets: [], transactions: [] });

    await user.click(screen.getByRole("button", { name: "Tạo ví đầu tiên" }));
    expect(callbacks.onAddWallet).toHaveBeenCalledOnce();
    expect(screen.getByText("Chưa có giao dịch nào.")).toBeInTheDocument();
  });

  it("reveals upcoming expenses progressively and confirms payment on demand", async () => {
    const user = userEvent.setup();
    const onConfirmRecurring = vi.fn();
    renderHome({
      upcomingExpenses: [{
        occurrenceId: "rent:2026-09-30",
        recurringExpenseId: "rent",
        name: "Tiền nhà",
        expectedAmount: 6_000_000,
        dueDate: "2026-09-30",
        walletId: 1,
        category: "Housing",
        status: "upcoming",
      }, {
        occurrenceId: "phone:2026-10-01",
        recurringExpenseId: "phone",
        name: "Điện thoại",
        expectedAmount: 200_000,
        dueDate: "2026-10-01",
        walletId: 1,
        category: "Others",
        status: "upcoming",
      }],
      onConfirmRecurring,
    });

    expect(screen.getAllByRole("heading", { name: "Financial Insights" })).toHaveLength(2);
    expect(screen.getAllByText("Điện thoại")).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: /tiền nhà/i })[0]);
    await user.click(screen.getByRole("button", { name: /xác nhận đã trả tiền nhà/i }));

    expect(onConfirmRecurring).toHaveBeenCalledWith("rent:2026-09-30");
  });
});

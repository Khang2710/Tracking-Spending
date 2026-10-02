import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyProvider } from "../../context/CurrencyContext";
import AssignBill from "./AssignBill";

vi.mock("../../App", () => ({
  C: { border: "#ddd", gold: "#b98a3d", green: "#27825b", surf: "#fff", bg: "#fff", white: "#111", tm: "#666" },
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={className}>{children}</section>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("./OcrScannerCard", () => ({
  OcrScannerCard: ({ onItemsParsed }: { onItemsParsed: (result: unknown) => void }) => (
    <button type="button" onClick={() => onItemsParsed({
      items: [{ name: "Dinner", price: 191 }],
      tax: 7,
      serviceCharge: 36,
      tip: 0,
      billDiscount: 0,
      otherFees: 0,
      receiptTotal: 234,
    })}>Use scanned receipt</button>
  ),
}));

describe("AssignBill receipt breakdown", () => {
  beforeEach(() => localStorage.setItem("wealthy_currency", "USD"));

  it("fills OCR adjustments and shows service charge in the matched debt breakdown", () => {
    render(
      <CurrencyProvider>
        <AssignBill
          friends={[]}
          onAddFriend={vi.fn()}
          onRemoveFriend={vi.fn()}
          balances={[]}
          setBalances={vi.fn()}
          userName="Khang"
          setBills={vi.fn()}
        />
      </CurrencyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use scanned receipt" }));

    expect(screen.getByLabelText("Tax")).toHaveValue(7);
    expect(screen.getByLabelText("Service charge")).toHaveValue(36);
    expect(screen.getByLabelText("Receipt total")).toHaveValue(234);
    expect(screen.getByText(/service charge \$36/i)).toBeInTheDocument();
    expect(screen.getByText("Matches receipt:")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyProvider } from "../../context/CurrencyContext";
import AssignBill from "./AssignBill";

vi.mock("../../App", () => ({
  C: { border: "#ddd", gold: "#b98a3d", green: "#27825b", surf: "#fff", bg: "#fff", white: "#111", tm: "#666" },
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={className}>{children}</section>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: { name?: string }) => ({
    "split.taxLabel": "Tax",
    "split.serviceCharge": "Service charge",
    "split.receiptTotal": "Receipt total",
    "split.receiptMatches": "Matches receipt",
    "split.breakdownItem": "Item",
    "split.itemDiscount": "Item discount",
    "split.billDiscount": "Bill discount",
    "split.tipGratuity": "Tip / gratuity",
    "split.otherFees": "Other fees",
    "split.whoPaid": "Who paid?",
    "split.toggleParticipant": `Assign ${options?.name ?? "participant"}`,
    "split.removeParticipant": `Remove ${options?.name ?? "participant"}`,
    "split.removeParticipantConfirm": `Confirm removing ${options?.name ?? "participant"}`,
  }[key] ?? key) }),
}));

vi.mock("./OcrScannerCard", () => ({
  OcrScannerCard: ({ onItemsParsed }: { onItemsParsed: (result: unknown) => void }) => (
    <>
      <button type="button" onClick={() => onItemsParsed({
        items: [{ name: "Dinner", price: 191 }],
        tax: 7,
        serviceCharge: 36,
        tip: 0,
        billDiscount: 0,
        otherFees: 0,
        receiptTotal: 234,
      })}>Use scanned receipt</button>
      <button type="button" onClick={() => onItemsParsed({
        items: [{ name: "Dessert", price: 10 }],
        tax: 1,
        serviceCharge: 2,
        tip: 0,
        billDiscount: 0,
        otherFees: 0,
        receiptTotal: 13,
      })}>Use another receipt</button>
      <button type="button" onClick={() => onItemsParsed({
        items: [{ name: "Comped", price: 10 }],
        tax: 0,
        serviceCharge: 0,
        tip: 0,
        billDiscount: 10,
        otherFees: 0,
        receiptTotal: 0,
      })}>Use zero-total receipt</button>
    </>
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
          balances={[]}
          setBalances={vi.fn()}
          userName="Khang"
          setBills={vi.fn()}
        />
      </CurrencyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use scanned receipt" }));

    expect(screen.getByLabelText("Tax")).toHaveValue("7");
    expect(screen.getByLabelText("Service charge")).toHaveValue("36");
    expect(screen.getByLabelText("Receipt total")).toHaveValue("234");
    expect(screen.getByText(/service charge \$36/i)).toBeInTheDocument();
    expect(screen.getByText("Matches receipt:")).toBeInTheDocument();
  });

  it("accumulates scanned receipt-level amounts and preserves an explicit zero total", () => {
    render(
      <CurrencyProvider>
        <AssignBill friends={[]} onAddFriend={vi.fn()} balances={[]} setBalances={vi.fn()} userName="Khang" setBills={vi.fn()} />
      </CurrencyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use scanned receipt" }));
    fireEvent.click(screen.getByRole("button", { name: "Use another receipt" }));
    expect(screen.getByLabelText("Tax")).toHaveValue("8");
    expect(screen.getByLabelText("Service charge")).toHaveValue("38");
    expect(screen.getByLabelText("Receipt total")).toHaveValue("247");

    fireEvent.click(screen.getByRole("button", { name: "Use zero-total receipt" }));
    expect(screen.getByLabelText("Receipt total")).toHaveValue("247");
  });

  it("removes an assigned payer only from the current draft after confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CurrencyProvider>
        <AssignBill friends={["Minh"]} onAddFriend={vi.fn()} balances={[{ id: 1, name: "Minh", balance: 25, history: [] }]} setBalances={vi.fn()} userName="Khang" setBills={vi.fn()} />
      </CurrencyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use scanned receipt" }));
    fireEvent.click(screen.getByText("Dinner"));
    fireEvent.click(screen.getByRole("button", { name: "Assign Minh" }));
    fireEvent.change(screen.getByLabelText("Who paid?"), { target: { value: "Minh" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove Minh" }));

    expect(confirm).toHaveBeenCalledWith("Confirm removing Minh");
    expect(screen.queryByRole("button", { name: "Remove Minh" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Who paid?")).toHaveValue("Khang");
  });
});

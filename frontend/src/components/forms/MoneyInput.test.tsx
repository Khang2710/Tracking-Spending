import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "./MoneyInput";

describe("MoneyInput", () => {
  it("selects a default zero and replaces it with the entered amount", () => {
    const onValueChange = vi.fn();
    render(<MoneyInput aria-label="Amount" value={0} onValueChange={onValueChange} requiredAmount />);
    const input = screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement;

    fireEvent.focus(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(1);
    fireEvent.change(input, { target: { value: "16" } });

    expect(input).toHaveValue("16");
    expect(onValueChange).toHaveBeenLastCalledWith(16);
  });

  it("allows an empty draft and normalizes a required field to zero on blur", () => {
    const onValueChange = vi.fn();
    render(<MoneyInput aria-label="Amount" value={0} onValueChange={onValueChange} requiredAmount />);
    const input = screen.getByRole("textbox", { name: "Amount" });

    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    fireEvent.blur(input);
    expect(input).toHaveValue("0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });
});

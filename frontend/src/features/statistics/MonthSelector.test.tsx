import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonthSelector } from "./MonthSelector";

const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

describe("MonthSelector", () => {
  it("renders all months and announces the selected month", () => {
    const onChange = vi.fn();
    render(<MonthSelector selected={9} onChange={onChange} months={labels} year={2026} />);
    expect(screen.getAllByRole("button")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Oct 2026" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Nov 2026" }));
    expect(onChange).toHaveBeenCalledWith(10);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SvgTrendChart } from "./SvgTrendChart";

describe("SvgTrendChart", () => {
  it("renders one accessible series path for income, spending, and savings", () => {
    render(
      <SvgTrendChart
        data={[
          { m: "Jan", income: 3000, outcome: 1200, savings: 1800 },
          { m: "Feb", income: 2200, outcome: 1700, savings: 500 },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Income, spending, and savings trend" })).toBeInTheDocument();
    expect(screen.getAllByTestId("trend-series")).toHaveLength(3);
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });

  it("renders the focused monthly comparison with crisp HTML text", () => {
    render(<SvgTrendChart data={[{ m: "Oct", income: 650, outcome: 12, savings: 638 }]} focusIndex={0} />);
    const chart = screen.getByRole("img", { name: "Income, spending, and savings trend" });
    expect(chart.tagName).toBe("DIV");
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("650")).toBeInTheDocument();
  });
});

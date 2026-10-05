import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

function BrokenScreen(): never {
  throw new Error("render failed");
}

describe("AppErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("offers a non-destructive reload without clearing saved data", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const clear = vi.spyOn(Storage.prototype, "clear");

    render(<AppErrorBoundary><BrokenScreen /></AppErrorBoundary>);

    expect(screen.getByText(/saved financial data has not been cleared/i)).toBeInTheDocument();
    expect(screen.queryByText(/clear localstorage/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload App" }));
    expect(clear).not.toHaveBeenCalled();
  });
});

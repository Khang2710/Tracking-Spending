import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreferencesOnboarding } from "./PreferencesOnboarding";

describe("PreferencesOnboarding", () => {
  it("requires the user to choose preferences and submits them", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PreferencesOnboarding onSave={onSave} />);

    fireEvent.click(screen.getByLabelText("English"));
    fireEvent.click(screen.getByLabelText("$ US dollar"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSave).toHaveBeenCalledWith({ language: "en", currency: "USD" });
  });
});

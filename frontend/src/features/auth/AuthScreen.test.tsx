import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  it("submits an email and password to sign in", async () => {
    const signInWithEmail = vi.fn().mockResolvedValue(undefined);

    render(<AuthScreen signInWithEmail={signInWithEmail} signUpWithEmail={vi.fn().mockResolvedValue({ confirmationRequired: false })} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "safe-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "safe-password");
  });

  it("lets a new user create an account", async () => {
    const signInWithEmail = vi.fn().mockResolvedValue(undefined);
    const signUpWithEmail = vi.fn().mockResolvedValue({ confirmationRequired: false });

    render(
      <AuthScreen
        signInWithEmail={signInWithEmail}
        signUpWithEmail={signUpWithEmail}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "safe-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUpWithEmail).toHaveBeenCalledWith("new@example.com", "safe-password");
  });

  it("explains that a new user must confirm their email before signing in", async () => {
    const signUpWithEmail = vi.fn().mockResolvedValue({ confirmationRequired: true });

    render(
      <AuthScreen
        signInWithEmail={vi.fn()}
        signUpWithEmail={signUpWithEmail}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "safe-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Check your email to confirm your account, then sign in.")).toBeVisible();
  });
});

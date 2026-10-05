import { FormEvent, useState } from "react";

interface AuthScreenProps {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
}

export function AuthScreen({ signInWithEmail, signUpWithEmail }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setConfirmationMessage("");
    setIsSubmitting(true);

    try {
      if (isCreatingAccount) {
        const result = await signUpWithEmail(email.trim(), password);
        if (result.confirmationRequired) {
          setConfirmationMessage("Check your email to confirm your account, then sign in.");
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-12 text-[#171b18] sm:grid sm:place-items-center">
      <form
        className="mx-auto w-full max-w-md rounded-[28px] border border-black/10 bg-white p-7 shadow-[0_24px_70px_rgba(36,31,22,0.10)] sm:p-9"
        onSubmit={handleSubmit}
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a26a2c]">Financial tracker</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{isCreatingAccount ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          {isCreatingAccount ? "Your data stays private to this account." : "Sign in to see only your wallets, spending, and savings."}
        </p>

        <label className="mt-7 block text-sm font-semibold" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          className="mt-2 w-full rounded-xl border border-black/15 bg-[#fbfaf7] px-4 py-3 text-base outline-none transition focus:border-[#171b18]"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className="mt-5 block text-sm font-semibold" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          className="mt-2 w-full rounded-xl border border-black/15 bg-[#fbfaf7] px-4 py-3 text-base outline-none transition focus:border-[#171b18]"
          type="password"
          autoComplete={isCreatingAccount ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <p role="alert" className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
        {confirmationMessage ? <p role="status" className="mt-4 text-sm leading-6 text-[#2f6b4f]">{confirmationMessage}</p> : null}

        <button
          className="mt-7 w-full rounded-xl bg-[#171b18] px-4 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isCreatingAccount ? "Creating account…" : "Signing in…") : (isCreatingAccount ? "Create account" : "Sign in")}
        </button>
        <button
          className="mt-4 w-full text-sm font-semibold text-black/60 underline underline-offset-4"
          type="button"
          onClick={() => {
            setError("");
            setConfirmationMessage("");
            setIsCreatingAccount((current) => !current);
          }}
        >
          {isCreatingAccount ? "Sign in" : "Create account"}
        </button>
      </form>
    </main>
  );
}

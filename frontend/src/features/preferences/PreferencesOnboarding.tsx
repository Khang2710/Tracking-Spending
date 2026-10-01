import { FormEvent, useState } from "react";
import type { CurrencyType } from "../../context/currencyAmounts";

export type AppLanguage = "vi" | "en";

interface PreferencesOnboardingProps {
  initialLanguage?: AppLanguage;
  initialCurrency?: CurrencyType;
  onSave: (preferences: { language: AppLanguage; currency: CurrencyType }) => Promise<void>;
}

export function PreferencesOnboarding({ initialLanguage = "vi", initialCurrency = "VND", onSave }: PreferencesOnboardingProps) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const [currency, setCurrency] = useState<CurrencyType>(initialCurrency);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ language, currency });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-12 text-[#171b18] sm:grid sm:place-items-center">
      <form onSubmit={submit} className="mx-auto w-full max-w-lg rounded-[30px] border border-black/10 bg-white p-7 shadow-[0_24px_70px_rgba(36,31,22,0.10)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a26a2c]">Financial tracker</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Set up your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-black/60">Choose how your amounts and content should be displayed. You can change this later in Settings.</p>

        <fieldset className="mt-8">
          <legend className="text-sm font-bold">Language</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([ ["vi", "Tiếng Việt"], ["en", "English"] ] as const).map(([value, label]) => (
              <label key={value} className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold ${language === value ? "border-[#171b18] bg-[#f1eee7]" : "border-black/10"}`}>
                <input className="sr-only" type="radio" name="language" value={value} checked={language === value} onChange={() => setLanguage(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="text-sm font-bold">Currency</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([ ["VND", "₫ Vietnamese đồng"], ["USD", "$ US dollar"] ] as const).map(([value, label]) => (
              <label key={value} className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold ${currency === value ? "border-[#171b18] bg-[#f1eee7]" : "border-black/10"}`}>
                <input className="sr-only" type="radio" name="currency" value={value} checked={currency === value} onChange={() => setCurrency(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <p role="alert" className="mt-5 text-sm text-[#b42318]">{error}</p> : null}
        <button type="submit" disabled={saving} className="mt-8 w-full rounded-xl bg-[#171b18] px-4 py-3 font-semibold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

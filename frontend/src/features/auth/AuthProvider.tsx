import { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AuthScreen } from "./AuthScreen";
import { PreferencesOnboarding, type AppLanguage } from "../preferences/PreferencesOnboarding";
import type { CurrencyType } from "../../context/currencyAmounts";
import i18n from "../../i18n";
import { AppLoadingScreen } from "../../components/common/AppLoadingScreen";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Unable to restore the Supabase session", error);
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session) {
      setPreferencesLoading(false);
      setNeedsPreferences(false);
      return () => { active = false; };
    }

    setPreferencesLoading(true);
    void supabase
      .from("tracker_profiles")
      .select("preferred_language,preferred_currency")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Unable to load user preferences", error);
          setPreferencesLoading(false);
          setNeedsPreferences(true);
          return;
        }
        const language = data?.preferred_language as AppLanguage | null | undefined;
        const currency = data?.preferred_currency as CurrencyType | null | undefined;
        if (language && currency) {
          localStorage.setItem("i18nextLng", language);
          localStorage.setItem("wealthy_currency", currency);
          void i18n.changeLanguage(language);
          window.dispatchEvent(new CustomEvent("wealthy-preferences-changed", { detail: { language, currency } }));
          setNeedsPreferences(false);
        } else {
          setNeedsPreferences(true);
        }
        setPreferencesLoading(false);
      });

    return () => { active = false; };
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [session]);

  if (loading) {
    return <AppLoadingScreen label={i18n.language?.startsWith("vi") ? "Đang khôi phục phiên làm việc…" : "Restoring your session…"} />;
  }

  if (!session) {
    return <AuthScreen
      signInWithEmail={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }}
      signUpWithEmail={async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        return { confirmationRequired: data.session === null };
      }}
    />;
  }

  if (preferencesLoading) {
    return <AppLoadingScreen label={i18n.language?.startsWith("vi") ? "Đang chuẩn bị không gian của bạn…" : "Preparing your workspace…"} />;
  }

  if (needsPreferences) {
    return <PreferencesOnboarding
      onSave={async ({ language, currency }) => {
        const { error } = await supabase.from("tracker_profiles").upsert({
          id: session.user.id,
          preferred_language: language,
          preferred_currency: currency,
        });
        if (error) throw error;
        localStorage.setItem("i18nextLng", language);
        localStorage.setItem("wealthy_currency", currency);
        await i18n.changeLanguage(language);
        window.dispatchEvent(new CustomEvent("wealthy-preferences-changed", { detail: { language, currency } }));
        setNeedsPreferences(false);
      }}
    />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

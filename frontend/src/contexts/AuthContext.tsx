import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export interface AuthResult {
  /** i18n key của lỗi (null = thành công) */
  error: string | null;
  /** true khi signup thành công nhưng cần xác nhận email trước khi login */
  needsEmailConfirmation?: boolean;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Map error message của Supabase sang i18n key để AuthScreen hiển thị đúng ngôn ngữ */
function mapAuthError(error: { message: string }): string {
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials")) return "auth.errors.invalidCredentials";
  if (msg.includes("already registered") || msg.includes("already exists")) return "auth.errors.emailTaken";
  if (msg.includes("at least 6 characters") || msg.includes("password should be"))
    return "auth.errors.weakPassword";
  if (msg.includes("unable to validate email") || msg.includes("invalid email"))
    return "auth.errors.invalidEmail";
  if (msg.includes("email not confirmed")) return "auth.errors.emailNotConfirmed";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout"))
    return "auth.errors.network";
  return "auth.errors.generic";
}

import { syncLocalDataToCloud } from "../services/syncService";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSynced = false;

    const triggerSyncOnce = (token: string) => {
      if (isSynced) return;
      isSynced = true;
      syncLocalDataToCloud(token).catch((err) =>
        console.error("[Auth] Bulk sync error:", err)
      );
    };

    // Lấy session hiện tại (supabase-js tự persist trong localStorage)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        console.debug(
          "[Auth] initial session:",
          data.session ? data.session.user.email : "null"
        );
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);

        if (data.session?.access_token) {
          triggerSyncOnce(data.session.access_token);
        }
      })
      .catch((err) => {
        console.error("[Auth] getSession failed:", err?.message ?? err);
        setLoading(false);
      });

    // Lắng nghe login / logout / token refresh / OAuth callback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.debug(
        `[Auth] event: ${event}`,
        newSession?.user?.email ?? "(no user)"
      );
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && newSession?.access_token) {
        triggerSyncOnce(newSession.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? mapAuthError(error) : null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: mapAuthError(error) };
    }
    // Nếu project bật "Confirm email": chưa có session ngay → yêu cầu check email
    const needsConfirmation = !data.session;
    return { error: null, needsEmailConfirmation: needsConfirmation };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Quay về /login (route PUBLIC) thay vì / (route có guard) —
        // tránh bị Auth Guard đá về login trong lúc client đang đổi code lấy session.
        // detectSessionInUrl sẽ bắt ?code=..., sau đó AuthScreen tự Navigate vào app.
        redirectTo: `${window.location.origin}/login`,
      },
    });
    return { error: error ? mapAuthError(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  }
  return ctx;
}

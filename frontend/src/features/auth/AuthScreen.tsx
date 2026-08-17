import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Settings2 } from "lucide-react";
import { C } from "../../App";
import { useAuth } from "../../contexts/AuthContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  // Supabase callback trả lỗi về dạng /login?error=...&error_description=...
  // (supabase-js không tự xử lý param này — phải đọc tay)
  const [oauthError, setOauthError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("error_description") || params.get("error");
  });

  useEffect(() => {
    if (oauthError) {
      console.error("[Auth] OAuth callback error:", oauthError);
      // Dọn error params khỏi URL để F5 không hiện lại lỗi cũ
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Đang quay về từ OAuth callback (/login?code=...) và client đang đổi code lấy session
  const isOAuthCallback = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("code");

  if (loading && isOAuthCallback) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#080809]">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{
            border: "3px solid rgba(201, 164, 91, 0.2)",
            borderTopColor: "#C9A45B",
          }}
        />
        <span className="text-xs text-tm font-semibold tracking-wide">
          {t("auth.completingSignIn", "Đang hoàn tất đăng nhập...")}
        </span>
      </div>
    );
  }

  // Đã đăng nhập (ví dụ: OAuth redirect về) → vào thẳng app
  if (!loading && user) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setErrorKey(null);
    setInfoKey(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setInfoKey(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setErrorKey("auth.errors.weakPassword");
      if (!trimmedEmail) setErrorKey("auth.errors.invalidEmail");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const result = await signInWithEmail(trimmedEmail, password);
        if (result.error) setErrorKey(result.error);
      } else {
        const result = await signUpWithEmail(trimmedEmail, password);
        if (result.error) {
          setErrorKey(result.error);
        } else if (result.needsEmailConfirmation) {
          setInfoKey("auth.checkEmail");
          setMode("login");
        }
        // Nếu signup tự login (project tắt confirm email) → onAuthStateChange sẽ render Navigate
      }
    } catch {
      setErrorKey("auth.errors.network");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setErrorKey(null);
    setInfoKey(null);
    // signInWithOAuth redirect cả trang sang Google — nếu lỗi mới quay lại đây
    const { error } = await signInWithGoogle();
    if (error) setErrorKey(error);
  };

  const inputStyle: React.CSSProperties = { borderColor: C.border };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-[#080809] overflow-y-auto">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full filter blur-[120px]"
          style={{ background: `radial-gradient(circle, ${C.gold} 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full filter blur-[120px]"
          style={{ background: `radial-gradient(circle, ${C.purple} 0%, transparent 70%)` }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-md p-8 rounded-3xl border shadow-2xl font-sans"
        style={{ background: C.card, borderColor: C.border }}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Logo */}
        <div
          className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-xl font-bold mb-5"
          style={{
            background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
            color: C.bg,
          }}
        >
          W
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">
          {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
        </h2>
        <p className="text-sm text-tm mb-6 text-center">
          {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
        </p>

        {/* Config warning: thiếu env vars */}
        {!isSupabaseConfigured && (
          <div
            className="mb-4 p-3 rounded-xl border text-[11px] leading-relaxed flex gap-2"
            style={{ background: "rgba(255, 193, 7, 0.08)", borderColor: "rgba(255, 193, 7, 0.3)", color: "#FFC107" }}
          >
            <Settings2 size={14} className="shrink-0 mt-0.5" />
            <span>{t("auth.configMissing")}</span>
          </div>
        )}

        {/* Lỗi trả về từ OAuth callback (vd: Unable to exchange external code) */}
        {oauthError && (
          <div
            className="mb-4 p-3 rounded-xl border text-xs flex flex-col gap-1"
            style={{ background: "rgba(255, 107, 107, 0.08)", borderColor: "rgba(255, 107, 107, 0.3)", color: C.red }}
          >
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> {t("auth.oauthFailedTitle")}
            </span>
            <span className="opacity-70 break-words font-mono text-[10px] leading-relaxed">{oauthError}</span>
            <span className="opacity-80 leading-relaxed">{t("auth.oauthExchangeHint")}</span>
          </div>
        )}

        {/* Error banner */}
        {errorKey && (
          <div
            className="mb-4 p-3 rounded-xl border text-xs font-semibold flex items-start gap-2"
            style={{ background: "rgba(255, 107, 107, 0.08)", borderColor: "rgba(255, 107, 107, 0.3)", color: C.red }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{t(errorKey, "Đã có lỗi xảy ra. Vui lòng thử lại.")}</span>
          </div>
        )}

        {/* Info banner (yêu cầu xác nhận email) */}
        {infoKey && (
          <div
            className="mb-4 p-3 rounded-xl border text-xs font-semibold flex items-start gap-2"
            style={{ background: "rgba(61, 220, 132, 0.08)", borderColor: "rgba(61, 220, 132, 0.3)", color: C.green }}
          >
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{t(infoKey)}</span>
          </div>
        )}

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.tm }} />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none border text-white bg-surf font-medium transition-all focus:border-gold text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-tm font-medium uppercase tracking-wider pl-0.5">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.tm }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-xl outline-none border text-white bg-surf font-medium transition-all focus:border-gold text-sm"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-1 transition-colors"
                style={{ color: C.tm }}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !isSupabaseConfigured}
            className="w-full py-3.5 mt-1 rounded-2xl font-bold text-sm cursor-pointer transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`,
              color: C.bg,
              boxShadow: `0 4px 14px ${C.gold}33`,
            }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: C.border }} />
          <span className="text-[11px] text-tm font-semibold uppercase tracking-wider">
            {t("auth.orDivider")}
          </span>
          <div className="flex-1 h-px" style={{ background: C.border }} />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={!isSupabaseConfigured}
          className="w-full py-3 rounded-2xl font-bold text-sm cursor-pointer transition-all flex items-center justify-center gap-2.5 border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
          style={{ borderColor: C.border, background: C.surf, color: C.white }}
        >
          <GoogleIcon />
          {t("auth.googleBtn")}
        </button>

        {/* Switch mode */}
        <p className="text-xs text-tm text-center mt-6">
          {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-bold cursor-pointer bg-transparent border-0 transition-opacity hover:opacity-80"
            style={{ color: C.gold }}
          >
            {mode === "login" ? t("auth.switchToSignup") : t("auth.switchToLogin")}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

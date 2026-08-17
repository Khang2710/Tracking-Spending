import React, { Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import AuthScreen from "./features/auth/AuthScreen.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import "./styles/index.css";
import "./i18n"; // Import i18n ở đây là chuẩn xác

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: "#ff6b6b", background: "#0f0f10", fontFamily: "sans-serif", minHeight: "100vh" }}>
          <h2 style={{ color: "#fff", marginBottom: 8 }}>App Encountered a Display Error</h2>
          <p style={{ color: "#8a8a8a", marginBottom: 16 }}>
            The app encountered an unhandled exception during render.
          </p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#f3d98b", background: "#1e1e21", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", fontSize: 13 }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: "12px 24px",
              background: "#c9a45b",
              color: "#0f0f10",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "20px",
              fontSize: "14px",
            }}
          >
            Reset App Data (Clear LocalStorage) & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { CurrencyProvider } from "./context/CurrencyContext";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <Routes>
                {/* Public: trang đăng nhập / đăng ký */}
                <Route path="/login" element={<AuthScreen />} />
                {/* Private: toàn bộ app chính nằm sau Auth Guard */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<App />} />
                </Route>
                {/* Mọi path lạ → về trang chủ (sẽ bị guard đẩy sang /login nếu chưa đăng nhập) */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CurrencyProvider>
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
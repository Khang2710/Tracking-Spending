import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css";
import "./i18n";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider } from "./features/auth/AuthProvider";
import { AppErrorBoundary } from "./features/app/AppErrorBoundary";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AuthProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

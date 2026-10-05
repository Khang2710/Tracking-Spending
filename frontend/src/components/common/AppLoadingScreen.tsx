import React from "react";
import i18n from "../../i18n";

export function AppLoadingScreen({ label }: { label?: string }) {
  const resolvedLabel = label ?? (i18n.language?.startsWith("vi") ? "Đang chuẩn bị không gian của bạn…" : "Preparing your workspace…");
  return (
    <main className="app-loading-screen" aria-live="polite" aria-busy="true">
      <div className="app-loading-card">
        <div className="app-loading-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="app-loading-brand">Financial tracker</p>
        <p className="app-loading-label">{resolvedLabel}</p>
      </div>
    </main>
  );
}

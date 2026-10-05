import type { CSSProperties, ReactNode } from "react";
import { C } from "../../design/tokens";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = "", style = {}, onClick }: CardProps) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${className}`}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: "0 14px 45px rgba(42, 45, 39, 0.055)",
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

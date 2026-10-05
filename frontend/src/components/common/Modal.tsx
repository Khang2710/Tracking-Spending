import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { C } from "../../design/tokens";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Dialog Container */}
          <motion.div
            className="paper-ledger paper-dialog relative w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl border"
            style={{ background: C.card, borderColor: C.border }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[var(--paper-ink)]" style={{ color: C.high }}>{title}</h3>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-medium text-[var(--paper-muted)] transition-colors hover:text-[var(--paper-ink)]"
              >
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


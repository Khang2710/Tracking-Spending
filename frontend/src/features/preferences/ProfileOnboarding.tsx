import { AnimatePresence, motion } from "motion/react";
import { C } from "../../design/tokens";

interface ProfileOnboardingProps {
  open: boolean;
  onComplete: (name: string) => void;
}

export function ProfileOnboarding({ open, onComplete }: ProfileOnboardingProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080809] p-4">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
            <div
              className="absolute left-[-10%] top-[-20%] aspect-square w-[60%] rounded-full blur-[120px]"
              style={{ background: `radial-gradient(circle, ${C.gold} 0%, transparent 70%)` }}
            />
            <div
              className="absolute bottom-[-10%] right-[-10%] aspect-square w-[50%] rounded-full blur-[120px]"
              style={{ background: `radial-gradient(circle, ${C.purple} 0%, transparent 70%)` }}
            />
          </div>

          <motion.div
            className="paper-ledger paper-dialog relative w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl"
            style={{ background: C.card, borderColor: C.border }}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-bold"
              style={{ background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldL} 100%)`, color: C.bg }}
            >
              W
            </div>
            <h2 className="mb-2 font-sans text-2xl font-bold tracking-tight text-white">Welcome to Wealthy</h2>
            <p className="mb-8 text-sm text-tm">Your luxury personal expense and portfolio assistant. Let's start by setting up your name.</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const input = form.elements.namedItem("name") as HTMLInputElement;
                const name = input.value.trim();
                if (name) onComplete(name);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2 text-left">
                <label htmlFor="onboarding-name" className="pl-1 text-xs font-medium uppercase tracking-wider text-tm">Your Name</label>
                <input
                  id="onboarding-name"
                  type="text"
                  name="name"
                  required
                  autoFocus
                  placeholder="Enter your name..."
                  className="w-full rounded-2xl border bg-surf px-5 py-3.5 font-semibold text-white outline-none transition-all focus:border-gold"
                  style={{ borderColor: C.border }}
                />
              </div>
              <button type="submit" className="mt-2 w-full cursor-pointer rounded-2xl py-3.5 text-sm font-bold transition-all hover:brightness-110" style={{ background: C.gold, color: C.bg }}>
                Get Started
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

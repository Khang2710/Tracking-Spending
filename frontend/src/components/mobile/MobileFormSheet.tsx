import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Drawer } from "vaul";

export type MobileFormSheetProps = {
  open: boolean;
  title: string;
  description: string;
  closeLabel: string;
  onOpenChange(open: boolean): void;
  footer?: ReactNode;
  children: ReactNode;
};

function getViewportGeometry(): { keyboardOffset: number; availableHeight: number | null } {
  if (typeof window === "undefined") return { keyboardOffset: 0, availableHeight: null };
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
  return {
    keyboardOffset: Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop),
    availableHeight: window.visualViewport?.height ?? null,
  };
}

export function MobileFormSheet({ open, title, description, closeLabel, onOpenChange, footer, children }: MobileFormSheetProps): ReactElement | null {
  const [{ keyboardOffset, availableHeight }, setViewportGeometry] = useState(getViewportGeometry);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const focusLifecycleRef = useRef<{ content: EventTarget | null; trigger: HTMLElement | null } | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    // Radix can temporarily detach composed refs while the same DOM node stays mounted.
    if (node) contentRef.current = node;
  }, []);

  const revealFocusedField = useCallback(() => {
    const region = scrollRegionRef.current;
    const field = document.activeElement;
    if (!region || !(field instanceof HTMLElement) || !region.contains(field)) return;
    const bounds = region.getBoundingClientRect();
    const fieldBounds = field.getBoundingClientRect();
    if (fieldBounds.bottom > bounds.bottom) {
      region.scrollTop += fieldBounds.bottom - bounds.bottom + 16;
    } else if (fieldBounds.top < bounds.top) {
      region.scrollTop -= bounds.top - fieldBounds.top + 16;
    }
  }, []);

  const scheduleFieldScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      revealFocusedField();
    });
  }, [revealFocusedField]);

  useEffect(() => {
    if (!open) {
      setViewportGeometry({ keyboardOffset: 0, availableHeight: null });
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const updateViewport = () => {
      setViewportGeometry(getViewportGeometry());
      scheduleFieldScroll();
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      if (focusFrameRef.current !== null) window.cancelAnimationFrame(focusFrameRef.current);
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
      focusFrameRef.current = null;
      scrollFrameRef.current = null;
      contentRef.current?.style.removeProperty("--keyboard-offset");
      contentRef.current?.style.removeProperty("bottom");
      contentRef.current?.style.removeProperty("max-height");
      contentRef.current = null;
      document.body.style.overflow = previousOverflow;
    };
  }, [open, scheduleFieldScroll]);

  // Unmount Vaul while closed so its viewport subscriptions also leave with the sheet.
  if (!open) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false} noBodyStyles handleOnly>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[#171A16]/35 backdrop-blur-[2px]" />
        <Drawer.Content
          ref={setContentRef}
          role="dialog"
          aria-modal="true"
          style={{ "--keyboard-offset": `${keyboardOffset}px`, bottom: `${keyboardOffset}px`, maxHeight: availableHeight === null ? "100dvh" : `${availableHeight}px` } as CSSProperties}
          className="paper-ledger fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-[32px] border border-white/70 bg-white text-[var(--paper-ink)] shadow-[0_30px_80px_rgba(23,26,22,0.24)] outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusLifecycleRef.current = {
              content: event.target,
              trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
            };
            focusFrameRef.current = window.requestAnimationFrame(() => {
              focusFrameRef.current = null;
              const field = scrollRegionRef.current?.querySelector<HTMLElement>(
                'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
              );
              (field ?? contentRef.current)?.focus({ preventScroll: true });
              revealFocusedField();
            });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const lifecycle = focusLifecycleRef.current;
            // Radix dispatches delayed autofocus on the closing content node. A new
            // opening has its own node and must keep its own trigger and focus.
            if (!lifecycle || lifecycle.content !== event.target) return;
            if (lifecycle.trigger?.isConnected) lifecycle.trigger.focus({ preventScroll: true });
            focusLifecycleRef.current = null;
          }}
        >
          <header className="shrink-0 px-5 pb-4 pt-3">
            <Drawer.Handle className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--paper-border)]" />
            <div className="flex items-center justify-between gap-3">
              <Drawer.Title className="text-[21px] font-extrabold tracking-[-0.03em]">{title}</Drawer.Title>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="min-h-11 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-semibold text-[var(--paper-muted)] hover:text-[var(--paper-ink)]"
              >
                {closeLabel}
              </button>
            </div>
            <Drawer.Description className="mt-1 text-sm text-[var(--paper-muted)]">{description}</Drawer.Description>
          </header>
          <div
            ref={scrollRegionRef}
            data-vaul-no-drag
            onFocusCapture={scheduleFieldScroll}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 ${footer ? "pb-4" : "pb-[max(16px,env(safe-area-inset-bottom))]"}`}
          >
            {children}
          </div>
          {footer ? <footer className="shrink-0 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</footer> : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

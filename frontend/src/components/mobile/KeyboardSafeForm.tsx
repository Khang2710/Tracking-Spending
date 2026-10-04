import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useVisualViewportGeometry } from "./useVisualViewportGeometry";

export function KeyboardSafeForm({ children, className = "" }: { children: ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const revealFocusedField = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const container = containerRef.current;
      const field = document.activeElement;
      if (!container || !(field instanceof HTMLElement) || !container.contains(field)) return;
      const fieldBounds = field.getBoundingClientRect();
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (window.visualViewport?.height ?? window.innerHeight);
      if (fieldBounds.bottom > viewportBottom) container.scrollTop += fieldBounds.bottom - viewportBottom + 20;
      else if (fieldBounds.top < viewportTop) container.scrollTop -= viewportTop - fieldBounds.top + 20;
    });
  }, []);
  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);
  const { keyboardOffset, availableHeight, offsetTop } = useVisualViewportGeometry(true, revealFocusedField);
  const keyboardOpen = keyboardOffset > 80 && availableHeight !== null;
  const containerTop = containerRef.current?.getBoundingClientRect().top ?? offsetTop;
  const keyboardSafeHeight = keyboardOpen
    ? Math.max(240, availableHeight - Math.max(0, containerTop - offsetTop))
    : undefined;

  return (
    <div
      ref={containerRef}
      data-keyboard-safe-form
      onFocusCapture={revealFocusedField}
      style={{
        maxHeight: keyboardSafeHeight === undefined ? undefined : `${keyboardSafeHeight}px`,
        overflowY: keyboardOpen ? "auto" : undefined,
        scrollPaddingBottom: keyboardOpen ? "24px" : undefined,
      } as CSSProperties}
      className={`min-w-0 overflow-x-clip overscroll-contain ${className}`}
    >
      {children}
    </div>
  );
}

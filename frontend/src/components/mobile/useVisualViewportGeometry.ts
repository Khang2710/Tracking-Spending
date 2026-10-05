import { useEffect, useState } from "react";

export type VisualViewportGeometry = {
  keyboardOffset: number;
  availableHeight: number | null;
  offsetTop: number;
};

export function getVisualViewportGeometry(): VisualViewportGeometry {
  if (typeof window === "undefined") return { keyboardOffset: 0, availableHeight: null, offsetTop: 0 };
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
  return {
    keyboardOffset: Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop),
    availableHeight: window.visualViewport?.height ?? null,
    offsetTop: viewportOffsetTop,
  };
}

export function useVisualViewportGeometry(active = true, onChange?: () => void): VisualViewportGeometry {
  const [geometry, setGeometry] = useState(getVisualViewportGeometry);

  useEffect(() => {
    if (!active) {
      setGeometry({ keyboardOffset: 0, availableHeight: null, offsetTop: 0 });
      return;
    }
    const viewport = window.visualViewport;
    const update = () => {
      setGeometry(getVisualViewportGeometry());
      onChange?.();
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active, onChange]);

  return geometry;
}

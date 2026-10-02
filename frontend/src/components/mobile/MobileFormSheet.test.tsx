import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileFormSheet } from "./MobileFormSheet";

class FakeVisualViewport extends EventTarget {
  height = 844;
  width = 390;
  offsetTop = 0;
  offsetLeft = 0;
  pageTop = 0;
  pageLeft = 0;
  scale = 1;
  onresize = null;
  onscroll = null;
  onscrollend = null;
  addEventListener = vi.fn(super.addEventListener.bind(this));
  removeEventListener = vi.fn(super.removeEventListener.bind(this));

  resizeTo(height: number) {
    this.height = height;
    this.dispatchEvent(new Event("resize"));
  }

  scrollTo(offsetTop: number) {
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event("scroll"));
  }
}

const props = {
  title: "New Transaction",
  description: "Add transaction",
  onOpenChange: vi.fn(),
};

describe("MobileFormSheet", () => {
  let viewport: FakeVisualViewport;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  const originalOverflow = document.body.style.overflow;

  function flushFrames() {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    });
  }

  beforeEach(() => {
    viewport = new FakeVisualViewport();
    frames = new Map();
    nextFrame = 0;
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 844);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)));
    document.body.style.overflow = "";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.style.overflow = originalOverflow;
  });

  it("tracks the keyboard-covered visual viewport and cleans up on close", () => {
    const { rerender } = render(<MobileFormSheet {...props} open><input aria-label="Description" /></MobileFormSheet>);
    const dialog = screen.getByRole("dialog");
    flushFrames();
    act(() => viewport.resizeTo(520));
    expect(dialog).toHaveStyle({ "--keyboard-offset": "324px", bottom: "324px" });

    rerender(<MobileFormSheet {...props} open={false}>{null}</MobileFormSheet>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(viewport.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(viewport.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(dialog.style.getPropertyValue("--keyboard-offset")).toBe("");
    expect(frames.size).toBe(0);
  });

  it("accounts for viewport scrolling, clamps the offset, and resets when the keyboard retracts", () => {
    render(<MobileFormSheet {...props} open>{null}</MobileFormSheet>);
    act(() => viewport.resizeTo(520));
    act(() => viewport.scrollTo(80));
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "244px" });
    act(() => viewport.scrollTo(400));
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "0px" });
    act(() => { viewport.scrollTo(0); viewport.resizeTo(844); });
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "0px" });
  });

  it("limits a tall sheet to the displaced visual viewport height", () => {
    render(<MobileFormSheet {...props} open><div style={{ height: 1000 }}>Tall form</div></MobileFormSheet>);
    act(() => { viewport.resizeTo(520); viewport.scrollTo(80); });
    expect(screen.getByRole("dialog")).toHaveStyle({ bottom: "244px", maxHeight: "520px" });
  });

  it("gives portalled controls the paper theme scope", () => {
    render(<MobileFormSheet {...props} open><input aria-label="Description" /></MobileFormSheet>);
    expect(screen.getByRole("dialog")).toHaveClass("paper-ledger");
  });

  it("measures an already-open keyboard on mount and after reopening", () => {
    viewport.height = 520;
    const { rerender } = render(<MobileFormSheet {...props} open>{null}</MobileFormSheet>);
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "324px" });
    rerender(<MobileFormSheet {...props} open={false}>{null}</MobileFormSheet>);
    act(() => viewport.resizeTo(700));
    rerender(<MobileFormSheet {...props} open>{null}</MobileFormSheet>);
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "144px" });
  });

  it("keeps an accessible dialog available without visualViewport", () => {
    vi.stubGlobal("visualViewport", undefined);
    render(<MobileFormSheet {...props} open footer={<button>Save transaction</button>}><input aria-label="Description" /></MobileFormSheet>);
    expect(screen.getByRole("dialog", { name: "New Transaction" })).toHaveAccessibleDescription("Add transaction");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "0px" });
    expect(screen.getByRole("dialog")).toHaveStyle({ maxHeight: "100dvh" });
    expect(screen.getByRole("button", { name: "Save transaction" })).toBeInTheDocument();
  });

  it("preserves geometry and deferred focus during StrictMode effect replay", () => {
    viewport.height = 520;
    render(<StrictMode><MobileFormSheet {...props} open><input aria-label="Description" /></MobileFormSheet></StrictMode>);
    expect(screen.getByRole("dialog")).toHaveStyle({ "--keyboard-offset": "324px" });
    expect(document.body.style.overflow).toBe("hidden");
    flushFrames();
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("does not subscribe or lock the body while closed and restores overflow after unmount", () => {
    document.body.style.overflow = "auto";
    const { rerender, unmount } = render(<MobileFormSheet {...props} open={false}>{null}</MobileFormSheet>);
    expect(viewport.addEventListener).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("auto");
    rerender(<MobileFormSheet {...props} open>{null}</MobileFormSheet>);
    expect(document.body.style.overflow).toBe("hidden");
    flushFrames();
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    expect(frames.size).toBe(0);
  });

  it("defers field focus and scrolls the field inside the sheet after viewport changes", () => {
    render(<MobileFormSheet {...props} open><input aria-label="Description" /></MobileFormSheet>);
    const field = screen.getByRole("textbox", { name: "Description" });
    const scrollRegion = field.parentElement!;
    expect(field).not.toHaveFocus();
    flushFrames();
    expect(field).toHaveFocus();

    vi.spyOn(scrollRegion, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 400 } as DOMRect);
    vi.spyOn(field, "getBoundingClientRect").mockReturnValue({ top: 450, bottom: 490 } as DOMRect);
    act(() => viewport.resizeTo(520));
    expect(scrollRegion.scrollTop).toBe(0);
    flushFrames();
    expect(scrollRegion.scrollTop).toBeGreaterThanOrEqual(90);
  });

  it("restores the opening control focus through the close lifecycle", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Add transaction</button><MobileFormSheet {...props} open={open} onOpenChange={setOpen}><input aria-label="Description" /></MobileFormSheet></>;
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Add transaction" });
    trigger.focus();
    fireEvent.click(trigger);
    flushFrames();
    expect(screen.getByRole("textbox")).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores stale close autofocus when reopened from a new trigger", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const fixture = (open: boolean) => <><button>First trigger</button><button>Newest trigger</button><MobileFormSheet {...props} open={open}><input aria-label="Description" /></MobileFormSheet></>;
    const { rerender } = render(fixture(false));
    const firstTrigger = screen.getByRole("button", { name: "First trigger" });
    const newestTrigger = screen.getByRole("button", { name: "Newest trigger" });
    firstTrigger.focus();
    rerender(fixture(true));
    flushFrames();
    rerender(fixture(false));
    newestTrigger.focus();
    rerender(fixture(true));
    flushFrames();
    act(() => vi.runOnlyPendingTimers());
    expect(screen.getByRole("textbox")).toHaveFocus();
    rerender(fixture(false));
    act(() => vi.runOnlyPendingTimers());
    expect(newestTrigger).toHaveFocus();
  });
});

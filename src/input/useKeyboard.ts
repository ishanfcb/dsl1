// Presenter keys (CLAUDE.md §5). This build wires Space (play/pause), Shift+Space (Automated / Scroll), D (sources), S (system on/off), ← → between the
// pages that exist, and Esc (back to the Map). 1–4 scenarios arrive with the Scenarios page.
import { useEffect, useRef } from "react";

export interface KeyHandlers {
  onPlayPause?(): void;
  /** Shift+Space: Automated ↔ Scroll. */
  onToggleMode?(): void;
  /** D: open / close the Sources sheet. */
  onToggleSources?(): void;
  onToggleSystem?(): void;
  onPage?(step: -1 | 1): void;
  onBack?(): void;
}

export function useKeyboard(handlers: KeyHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.shiftKey) ref.current.onToggleMode?.();
        else ref.current.onPlayPause?.();
      } else if (e.key === "s" || e.key === "S") {
        ref.current.onToggleSystem?.();
      } else if (e.key === "d" || e.key === "D") {
        ref.current.onToggleSources?.();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        ref.current.onPage?.(e.key === "ArrowLeft" ? -1 : 1);
      } else if (e.key === "Escape") {
        ref.current.onBack?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

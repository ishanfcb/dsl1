// Hover notes: rest the pointer on anything that carries one for HOVER_DELAY_MS and a small glass box above it
// says in plain words what it is (and, for a number, where it comes from, as a link). It stays while the pointer
// moves onto the box, so that link can be clicked, and goes once the pointer has left both. Keyboard focus shows
// it at once. One box for the whole page: elements register with useExplain().
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const HOVER_DELAY_MS = 2000;
/** How long the box waits after the pointer leaves, so the pointer can cross the gap onto it. */
const LEAVE_GRACE_MS = 300;
/** Gap between the box and the element (px), and the closest the box comes to the window edge. */
const GAP = 10;
const EDGE = 12;

export interface Tip {
  /** The one-liner. */
  body: ReactNode;
  /** Small muted line under it: the source, and what kind of number it is. */
  meta?: ReactNode;
}

interface Shown {
  get(): Tip | null;
  el: Element;
}

let current: Shown | null = null;
const listeners = new Set<(s: Shown | null) => void>();
function emit(s: Shown | null) {
  window.clearTimeout(leaveTimer);
  current = s;
  for (const l of listeners) l(s);
}

let leaveTimer: number | undefined;
/** Hide `s` after the grace period, unless the pointer reaches the box (or another element) first. */
function hideSoon(s: Shown | null) {
  window.clearTimeout(leaveTimer);
  leaveTimer = window.setTimeout(() => {
    if (current && current === s) emit(null);
  }, LEAVE_GRACE_MS);
}

/** Props to spread on any element (HTML or SVG) to give it a hover note. Pass null for none. */
export function useExplain(tip: Tip | null) {
  const latest = useRef(tip);
  latest.current = tip;
  const timer = useRef<number | undefined>(undefined);
  const mine = useRef<Shown | null>(null);
  const show = (el: Element) => {
    if (!latest.current) return;
    mine.current = { get: () => latest.current, el };
    emit(mine.current);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (current && current === mine.current) emit(null);
  };
  // Hide the box if this element goes away while it is shown.
  useEffect(() => hide, []);
  return {
    onPointerEnter: (e: { currentTarget: Element }) => {
      const el = e.currentTarget;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => show(el), HOVER_DELAY_MS);
    },
    onPointerLeave: () => {
      window.clearTimeout(timer.current);
      hideSoon(mine.current);
    },
    onFocus: (e: { currentTarget: Element }) => show(e.currentTarget),
    onBlur: hide,
  };
}

/** Wraps inline content in a span that carries a hover note. */
export function Explain({ tip, children, className }: { tip: Tip | null; children: ReactNode; className?: string }) {
  const props = useExplain(tip);
  return (
    <span className={className ? `explain ${className}` : "explain"} {...props}>
      {children}
    </span>
  );
}

/** The one box. Mount once per page. It re-reads the note on every render, so a live value stays current. */
export function ExplainLayer() {
  const [shown, setShown] = useState<Shown | null>(current);
  const [, tick] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const l = (s: Shown | null) => setShown(s);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  // Live notes (a junction's state, the clock) change while shown: re-read a few times a second.
  useEffect(() => {
    if (!shown) return;
    const id = window.setInterval(() => tick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [shown]);

  useLayoutEffect(() => {
    if (!shown || !box.current) return setPos(null);
    const r = shown.el.getBoundingClientRect();
    const w = box.current.offsetWidth;
    const h = box.current.offsetHeight;
    const below = r.top - GAP - h < EDGE;
    const left = Math.min(window.innerWidth - EDGE - w, Math.max(EDGE, r.left + r.width / 2 - w / 2));
    setPos({ left, top: below ? r.bottom + GAP : r.top - GAP - h, below });
  }, [shown]);

  const tip = shown?.get() ?? null;
  return createPortal(
    <AnimatePresence>
      {shown && tip && (
        <motion.div
          key="tip"
          ref={box}
          className="tip"
          role="tooltip"
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          initial={reduced ? false : { opacity: 0, y: pos?.below ? -4 : 4 }}
          animate={{ opacity: pos ? 1 : 0, y: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onPointerEnter={() => window.clearTimeout(leaveTimer)}
          onPointerLeave={() => hideSoon(shown)}
        >
          <div className="tip__body">{tip.body}</div>
          {tip.meta && <div className="tip__meta">{tip.meta}</div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

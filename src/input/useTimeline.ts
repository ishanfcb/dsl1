// Two explicit modes (CLAUDE.md §5). Automated: the scenario plays and loops; Space pauses and resumes.
// Scroll: the wheel is the scrubber. Only the mode toggle (or Shift+Space) switches between them; touching the
// mouse or trackpad never does. Produces engine time as a motion value. Nothing here simulates.
import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, type MotionValue } from "motion/react";

export interface TimelineOptions {
  /** Engine seconds at the start and end of the scrubbable range. */
  start: number;
  end: number;
  /** Engine seconds per screen second while playing (scaling.timeCompression). */
  compression: number;
  reducedMotion: boolean;
  /** Where to open (engine seconds). Defaults to `start`. */
  initial?: number;
  /** When this changes (a new city), jump back to `start` instead of keeping the moment. */
  resetKey?: unknown;
}

export type TimelineMode = "auto" | "scroll";

/** Wheel distance (px) that scrubs the whole range. */
const WHEEL_PX_FOR_RANGE = 4000;
/** Hold on the last frame before looping (screen seconds). */
const END_HOLD_S = 2;

export interface Timeline {
  /** Smoothed engine time, for drawing. */
  time: MotionValue<number>;
  mode: TimelineMode;
  playing: boolean;
  setMode(mode: TimelineMode): void;
  toggleMode(): void;
  /** Automated: pause / resume. Scroll: switch to automated and play. */
  togglePlay(): void;
}

export function useTimeline({ start, end, compression, reducedMotion, initial, resetKey }: TimelineOptions): Timeline {
  const target = useMotionValue(initial ?? start);
  const spring = useSpring(target, { stiffness: 140, damping: 32, restDelta: 0.001 });
  const time = reducedMotion ? target : spring;
  const [mode, setModeState] = useState<TimelineMode>("auto");
  const [playing, setPlaying] = useState(true);
  const modeRef = useRef<TimelineMode>("auto");
  const playingRef = useRef(true);
  const range = useRef({ start, end });
  range.current = { start, end };

  const setPlay = (p: boolean) => {
    playingRef.current = p;
    setPlaying(p);
  };
  const setMode = (m: TimelineMode) => {
    modeRef.current = m;
    setModeState(m);
    setPlay(m === "auto");
  };

  // Keep the target inside the range when the range changes (e.g. switching Without / With system).
  useEffect(() => {
    target.set(Math.min(end, Math.max(start, target.get())));
  }, [start, end, target]);

  const lastReset = useRef(resetKey);
  useEffect(() => {
    if (lastReset.current === resetKey) return;
    lastReset.current = resetKey;
    target.jump(range.current.start);
    spring.jump(range.current.start);
  }, [resetKey, target, spring]);

  useEffect(() => {
    const clamp = (t: number) => Math.min(range.current.end, Math.max(range.current.start, t));
    const onWheel = (e: WheelEvent) => {
      if (modeRef.current !== "scroll") return;
      const { start: s, end: en } = range.current;
      target.set(clamp(target.get() + (e.deltaY / WHEEL_PX_FOR_RANGE) * (en - s)));
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    let frame = 0;
    let last = performance.now();
    let heldSince: number | null = null;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playingRef.current) {
        const { start: s, end: en } = range.current;
        const t = target.get();
        if (t >= en) {
          heldSince ??= now;
          if ((now - heldSince) / 1000 > END_HOLD_S) {
            heldSince = null;
            target.jump(s);
            spring.jump(s);
          }
        } else {
          target.set(Math.min(en, t + dt * compression));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", onWheel);
    };
  }, [target, spring, compression]);

  return {
    time,
    mode,
    playing,
    setMode,
    toggleMode() {
      setMode(modeRef.current === "auto" ? "scroll" : "auto");
    },
    togglePlay() {
      if (modeRef.current === "scroll") setMode("auto");
      else setPlay(!playingRef.current);
    },
  };
}

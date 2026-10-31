// Scroll is the scrubber; 8 s without input starts autoplay; any input takes control back (CLAUDE.md §5).
// Produces engine time as a motion value. Nothing here simulates.
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
}

const IDLE_MS = 8000;
/** Wheel distance (px) that scrubs the whole range. */
const WHEEL_PX_FOR_RANGE = 4000;
/** Hold on the last frame before looping (screen seconds). */
const END_HOLD_S = 2;

export interface Timeline {
  /** Smoothed engine time, for drawing. */
  time: MotionValue<number>;
  playing: boolean;
  togglePlay(): void;
}

export function useTimeline({ start, end, compression, reducedMotion, initial }: TimelineOptions): Timeline {
  const target = useMotionValue(initial ?? start);
  const spring = useSpring(target, { stiffness: 140, damping: 32, restDelta: 0.001 });
  const time = reducedMotion ? target : spring;
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const lastInput = useRef(performance.now());
  const range = useRef({ start, end });
  range.current = { start, end };

  const setPlay = (p: boolean) => {
    playingRef.current = p;
    setPlaying(p);
  };

  // Keep the target inside the range when the range changes (e.g. switching Without / With system).
  useEffect(() => {
    target.set(Math.min(end, Math.max(start, target.get())));
  }, [start, end, target]);

  useEffect(() => {
    const clamp = (t: number) => Math.min(range.current.end, Math.max(range.current.start, t));
    const takeControl = () => {
      lastInput.current = performance.now();
      if (playingRef.current) setPlay(false);
    };
    const onWheel = (e: WheelEvent) => {
      takeControl();
      const { start: s, end: en } = range.current;
      target.set(clamp(target.get() + (e.deltaY / WHEEL_PX_FOR_RANGE) * (en - s)));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") return; // play/pause is handled by togglePlay
      takeControl();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointermove", takeControl);
    window.addEventListener("pointerdown", takeControl);
    window.addEventListener("keydown", onKey);

    let frame = 0;
    let last = performance.now();
    let heldSince: number | null = null;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!playingRef.current && now - lastInput.current > IDLE_MS) setPlay(true);
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
      window.removeEventListener("pointermove", takeControl);
      window.removeEventListener("pointerdown", takeControl);
      window.removeEventListener("keydown", onKey);
    };
  }, [target, spring, compression]);

  return {
    time,
    playing,
    togglePlay() {
      lastInput.current = performance.now();
      setPlay(!playingRef.current);
    },
  };
}

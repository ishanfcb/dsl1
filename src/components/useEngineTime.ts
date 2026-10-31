// Engine time as React state for shell text, at a readable rate instead of every frame.
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

const INTERVAL_MS = 100;

export function useEngineTime(time: MotionValue<number>): number {
  const [t, setT] = useState(time.get());
  const last = useRef(0);
  const trailing = useRef<number | undefined>(undefined);
  useMotionValueEvent(time, "change", (v) => {
    const now = performance.now();
    window.clearTimeout(trailing.current);
    if (now - last.current >= INTERVAL_MS) {
      last.current = now;
      setT(v);
    } else {
      trailing.current = window.setTimeout(() => setT(time.get()), INTERVAL_MS);
    }
  });
  useEffect(() => () => window.clearTimeout(trailing.current), []);
  return t;
}

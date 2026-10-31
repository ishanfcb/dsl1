// The headline: how much sooner the ambulance clears the corridor with the system, from the two engine runs.
import type { ReactNode } from "react";

export function formatMinSec(s: number): string {
  const v = Math.round(Math.abs(s));
  const m = Math.floor(v / 60);
  return m > 0 ? `${m} min ${v % 60} s` : `${v} s`;
}

export function TimeSaved({ seconds, source }: { seconds: number | null; source: ReactNode }) {
  const text = seconds === null ? "No result" : seconds >= 0 ? `${formatMinSec(seconds)} faster` : `${formatMinSec(seconds)} slower`;
  return (
    <div className="saved">
      <div className="saved__value">{text}</div>
      <div className="saved__src">{source}</div>
    </div>
  );
}

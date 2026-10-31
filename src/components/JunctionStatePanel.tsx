// Each junction's state as a short uppercase line, with a lamp that blinks, stays on or is hollow.
// The pins in the map carry the longer description.
import { blue, JUNCTIONS, type JunctionId, type SimState } from "../engine";

export function JunctionStatePanel({ state, names }: { state: Readonly<SimState>; names: Record<JunctionId, string> }) {
  return (
    <>
      {JUNCTIONS.map((j) => {
        const c = state.controllers[j];
        return (
          <div key={j}>
            <span className={`lamp lamp--${blue(c)}`} aria-hidden="true" />
            <span className="status__label">{j} · {names[j]}</span> — {c.state}
          </div>
        );
      })}
    </>
  );
}

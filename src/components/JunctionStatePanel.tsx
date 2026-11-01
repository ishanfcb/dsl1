// Each junction's state as a row, with a lamp that blinks, stays on or is hollow.
// The pins in the map carry the longer description.
import { blue, JUNCTIONS, type JunctionId, type SimState } from "../engine";

export function JunctionStatePanel({ state, names }: { state: Readonly<SimState>; names: Record<JunctionId, string> }) {
  return (
    <div className="states">
      {JUNCTIONS.map((j) => {
        const c = state.controllers[j];
        return (
          <div className="row" key={j}>
            <span>
              <span className={`lamp lamp--${blue(c)}`} aria-hidden="true" />
              {j} · {names[j]}
            </span>
            <span className="row__value pill">{c.state}</span>
          </div>
        );
      })}
    </div>
  );
}

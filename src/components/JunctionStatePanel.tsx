// Each junction's state in words, with a lamp that blinks, stays on or is hollow, so colour is never the only signal.
import { blue, JUNCTIONS, type JunctionId, type SimState } from "../engine";
import { STATE_TEXT } from "./junctionText";

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
            <span className="row__value row__label">{STATE_TEXT[c.state]}</span>
          </div>
        );
      })}
    </div>
  );
}

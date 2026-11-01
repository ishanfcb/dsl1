// Panel text for the Junction page: the junction's state, where it is in its signal cycle,
// and each approach's light and queue, all read from the engine at the current time.
import { blue, junctionQueues, lights, ROLES, type JunctionId, type Light, type Role, type SimConfig, type SimState } from "../engine";
import { DataBadge, type DataNode } from "./DataBadge";
import { Explain } from "./Explain";
import { explain, STATE_EXPLAIN } from "./explanations";
import { STATE_TEXT } from "./junctionText";

const ROLE_TEXT: Record<Role, string> = {
  in: "Ambulance approach",
  out: "Oncoming",
  left: "From left",
  right: "From right",
};

export function JunctionDetail({ cfg, state, junction, cycle, queuedBelow, queuedBelowMs }: {
  cfg: SimConfig;
  state: Readonly<SimState>;
  junction: JunctionId;
  cycle: DataNode;
  queuedBelow: DataNode;
  queuedBelowMs: number;
}) {
  const j = cfg.junctions[junction];
  const c = state.controllers[junction];
  const now = lights(cfg, j, c, state.t);
  const queues = junctionQueues(cfg, state, junction, queuedBelowMs);
  // The cycle clock stands still from ALERT until the junction is back to NORMAL.
  const held = c.state === "ALERT" || c.state === "CLEARED";

  return (
    <div className="detail">
      <Explain className="detail__state" tip={{ body: STATE_EXPLAIN[c.state] }}>
        <span className={`lamp lamp--${blue(c)}`} aria-hidden="true" />
        {STATE_TEXT[c.state]}
      </Explain>

      <div className="row">
        <Explain className="row__label" tip={{ body: explain.cycle }}>{held ? "Cycle held at" : "Cycle"}</Explain>
        <span className="row__value pill">
          {Math.floor(c.cycleClock)} s of <DataBadge node={cycle} unit="s" digits={0} explain={explain.cycleLength} />
        </span>
      </div>

      <table className="arms">
        <thead>
          <tr>
            <th scope="col">Approach</th>
            <th scope="col"><Explain tip={{ body: explain.light }}>Light</Explain></th>
            <th scope="col" className="arms__num"><Explain tip={{ body: explain.queue }}>Queue</Explain></th>
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => (
            <tr key={role}>
              <th scope="row">
                <Explain tip={{ body: explain.approach[role] }}>{ROLE_TEXT[role]}</Explain>
                {j.arms[role].name && <span className="arms__sub">{j.arms[role].name}</span>}
              </th>
              <td><LightDot light={now[role]} /></td>
              <td className="arms__num">
                {Math.round(queues[role].length)} m
                <span className="arms__sub">{queues[role].vehicles} veh</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="detail__note">
        Queue: longest lane, from the stop line back while traffic is under{" "}
        <DataBadge node={queuedBelow} unit="km/h" digits={0} explain={explain.queuedBelow} />. Engine, this run.
      </p>
      <a className="detail__back" href="#map">← Back to map</a>
    </div>
  );
}

/** Light as a word with a small dot, so colour is never the only signal. */
function LightDot({ light }: { light: Light }) {
  return (
    <span className="light">
      <span className={`light__dot light__dot--${light.toLowerCase()}`} aria-hidden="true" />
      {light}
    </span>
  );
}

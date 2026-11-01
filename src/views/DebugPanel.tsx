// Build-order step 1: an unstyled window onto the engine. Reads engine state only; holds no simulation state.
import { useEffect, useMemo, useState } from "react";
import data from "@data/scenarios.json";
import { blue, buildConfig, compare, lights, JUNCTIONS, ROLES, scenarioIds, type Simulation } from "../engine";

const ids = scenarioIds(data);
const kmh = (ms: number) => (ms * 3.6).toFixed(1);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmt = (s: number | null) => (s === null ? "—" : `${s.toFixed(1)} s (${clock(s)})`);

export function DebugPanel() {
  const [id, setId] = useState(ids[0]);
  const [system, setSystem] = useState(true);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const cfg = useMemo(() => buildConfig(data, id), [id]);
  const runs = useMemo(() => compare(cfg), [cfg]);
  const sim: Simulation = system ? runs.withSystem : runs.without;

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = ((now - last) / 1000) * cfg.timeCompression;
      last = now;
      setT((prev) => Math.min(sim.duration, prev + dt));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, sim, cfg.timeCompression]);

  const s = sim.at(t);
  const amb = s.vehicles.find((v) => v.id === s.ambulanceId);
  const gps = sim.log.gps.filter((p) => p.t <= t).at(-1);
  const counts: Record<string, number> = {};
  for (const v of s.vehicles) counts[v.segment] = (counts[v.segment] ?? 0) + 1;

  const routeEnd = cfg.segments.route.endX;
  const W = 1200;
  const laneH = 6;
  const sx = (x: number) => (x / routeEnd) * W;

  return (
    <div className="mono" style={{ padding: 16 }}>
      <h2>Engine debug</h2>
      <p>
        <select value={id} onChange={(e) => { setId(e.target.value); setT(0); }}>
          {ids.map((i) => <option key={i}>{i}</option>)}
        </select>{" "}
        <label><input type="checkbox" checked={system} onChange={(e) => setSystem(e.target.checked)} /> with system</label>{" "}
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "pause" : "play"}</button>{" "}
        <input type="range" min={0} max={sim.duration} step={cfg.dt} value={t} style={{ width: 600 }}
          onChange={(e) => setT(Number(e.target.value))} />
      </p>
      <p>
        real time {clock(s.t)} ({s.t.toFixed(1)} s) · screen time {(s.t / cfg.timeCompression).toFixed(1)} s (×{cfg.timeCompression}) · run
        length {clock(sim.duration)} · traffic {kmh(cfg.trafficSpeed)} km/h
        {cfg.floodCapKmh !== null && ` · flood cap ${cfg.floodCapKmh.toFixed(1)} km/h`}
      </p>

      <svg width={W} height={cfg.routeLanes * laneH + 20} style={{ border: "1px solid #999" }}>
        {JUNCTIONS.map((j) => {
          const jc = cfg.junctions[j];
          return <rect key={j} x={sx(jc.centreX - jc.boxDepth / 2)} y={0} width={Math.max(1, sx(jc.boxDepth))} height={cfg.routeLanes * laneH} fill="#ddd" />;
        })}
        {s.vehicles.filter((v) => v.segment === "route").map((v) => (
          <rect key={v.id} x={sx(v.x - v.length)} width={Math.max(1, sx(v.length))}
            y={v.lane * laneH + 1} height={laneH - 2}
            fill={v.type === "ambulance" ? "red" : "#333"} />
        ))}
        <text x={2} y={cfg.routeLanes * laneH + 14} fontSize={10}>route (J1.in → J1 → link → J2 → J2.out), {Math.round(routeEnd)} m</text>
      </svg>

      <table border={1} cellPadding={4} style={{ borderCollapse: "collapse", marginTop: 12 }}>
        <thead><tr><th>junction</th><th>state</th><th>blue</th>{ROLES.map((r) => <th key={r}>{r}</th>)}<th>cycle pos</th></tr></thead>
        <tbody>
          {JUNCTIONS.map((j) => {
            const l = lights(cfg, cfg.junctions[j], s.controllers[j], s.t);
            return (
              <tr key={j}>
                <td>{j}</td><td>{s.controllers[j].state}</td><td>{blue(s.controllers[j])}</td>
                {ROLES.map((r) => <td key={r}>{l[r]}{cfg.junctions[j].arms[r].name ? ` (${cfg.junctions[j].arms[r].name})` : ""}</td>)}
                <td>{s.controllers[j].cycleClock.toFixed(1)} / {cfg.junctions[j].cycle}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>Ambulance</h3>
      <p>
        {amb ? `x ${amb.x.toFixed(1)} m · ${kmh(amb.v)} km/h (desired ${kmh(amb.v0)}) · lane ${amb.lane}` : s.ambulance.exitedAt !== null ? "exited" : "not yet entered"}
        <br />
        last GPS: {gps ? `t ${gps.t.toFixed(1)} · x ${gps.x.toFixed(1)} · ${kmh(gps.speed)} km/h · to J1 ${gps.distToJ1.toFixed(0)} m · to J2 ${gps.distToJ2.toFixed(0)} m` : "—"}
      </p>

      <h3>Result (same seed)</h3>
      <table border={1} cellPadding={4} style={{ borderCollapse: "collapse" }}>
        <thead><tr><th></th><th>entered</th><th>passed J1</th><th>passed J2</th><th>exited</th><th>travel time</th></tr></thead>
        <tbody>
          {([["without", runs.without], ["with", runs.withSystem]] as const).map(([label, r]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{fmt(r.result.ambulance.enteredAt)}</td><td>{fmt(r.result.ambulance.passedJ1At)}</td>
              <td>{fmt(r.result.ambulance.passedJ2At)}</td><td>{fmt(r.result.ambulance.exitedAt)}</td>
              <td>{fmt(r.result.travelTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>time saved: {fmt(runs.timeSaved)}</p>

      <h3>Traffic</h3>
      <p>
        sprites on screen by segment: {Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(" · ")}
        <br />
        queued off-screen (vehicles): {Object.entries(s.spawns).map(([k, st]) => `${k} +${st.backlog.length * cfg.vehiclesPerSprite}`).join(" · ")}
        <br />
        volumes (veh/h): {JUNCTIONS.flatMap((j) => ROLES.map((r) => `${j}.${r} ${Math.round(cfg.junctions[j].arms[r].volumeVehPerHr)}`)).join(" · ")}
      </p>

      <h3>State events</h3>
      <ul>
        {sim.log.events.map((e, i) => (
          <li key={i} style={{ fontWeight: e.t <= t ? "bold" : "normal" }}>{e.t.toFixed(1)} s · {e.junction}: {e.from} → {e.to}</li>
        ))}
        {sim.log.events.length === 0 && <li>none (system off)</li>}
      </ul>
    </div>
  );
}

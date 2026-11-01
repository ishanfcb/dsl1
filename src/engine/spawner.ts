// Arrivals: a seeded Poisson stream per arm, so both modes see the same vehicles at the same times.

import { Stream, streamSeed } from "./rng";
import { ROLES, JUNCTIONS, VEHICLE_TYPES, type ArmConfig, type ArmSpawnState, type SegmentId, type SimConfig, type SimState, type Vehicle, type VehicleType } from "./types";

export interface SpawnPoint {
  key: string;
  segment: SegmentId;
  arm: ArmConfig;
  /** Sprites per second. */
  rate: number;
}

export function spawnPoints(cfg: SimConfig): SpawnPoint[] {
  const points: SpawnPoint[] = [];
  for (const j of JUNCTIONS) {
    for (const r of ROLES) {
      if (j === "J2" && r === "in") continue; // fed by J1
      const arm = cfg.junctions[j].arms[r];
      points.push({
        key: `${j}.${r}`,
        segment: r === "in" ? "route" : (`${j}.${r}` as SegmentId),
        arm,
        rate: arm.volumeVehPerHr / cfg.vehiclesPerSprite / 3600,
      });
    }
  }
  return points;
}

export function initialSpawns(cfg: SimConfig, seed: number): Record<string, ArmSpawnState> {
  const out: Record<string, ArmSpawnState> = {};
  for (const p of spawnPoints(cfg)) {
    const st: ArmSpawnState = { rng: streamSeed(seed, p.key), nextArrival: Infinity, backlog: [] };
    if (p.rate > 0) st.nextArrival = new Stream(st).exponential(p.rate);
    out[p.key] = st;
  }
  return out;
}

/** Moves every arrival due by time t into the arm's off-screen backlog. */
export function collectArrivals(cfg: SimConfig, s: SimState, p: SpawnPoint): void {
  const st = s.spawns[p.key];
  const stream = new Stream(st);
  while (st.nextArrival <= s.t) {
    st.backlog.push(makeVehicle(cfg, stream, p, s.nextId++));
    st.nextArrival += stream.exponential(p.rate);
  }
}

function makeVehicle(cfg: SimConfig, stream: Stream, p: SpawnPoint, id: number): Vehicle {
  // Fixed draw order: every vehicle consumes the same draws whatever the mode.
  const shares = {} as Record<VehicleType, number>;
  for (const t of VEHICLE_TYPES) shares[t] = cfg.types[t].share;
  const type = stream.pick(shares);
  const { sd, min, max } = cfg.desiredSpeed;
  const factor = Math.min(max, Math.max(min, stream.normal(1, sd)));
  const lane = Math.min(p.arm.lanes - 1, Math.floor(stream.uniform() * p.arm.lanes));
  const willTurn = stream.uniform() >= cfg.j1ThroughShare;
  const tc = cfg.types[type];
  return {
    id,
    type,
    segment: p.segment,
    x: 0,
    v: 0,
    v0: cfg.trafficSpeed * factor * tc.speedFactor,
    length: tc.length,
    s0: tc.s0,
    T: tc.T,
    lane,
    willTurn: p.segment === "route" && willTurn,
    admitted: null,
  };
}

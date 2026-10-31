// One fixed time step of the whole simulation. Mutates SimState; appends to RunLog.

import { idmAcceleration, integrate } from "./idm";
import { advanceClock, blue, lights, transition } from "./signals";
import { collectArrivals, type SpawnPoint } from "./spawner";
import { JUNCTIONS, type JunctionId, type JunctionState, type Light, type Role, type RunLog, type SimConfig, type SimState, type Vehicle } from "./types";

type LaneLists = Map<string, Vehicle[]>;
/** Numerical tolerance for holding vehicles at a stop line, in metres. Not a traffic parameter. */
const STOP_MARGIN = 0.5;
const laneKey = (segment: string, lane: number) => `${segment}|${lane}`;

function buildLanes(s: SimState): LaneLists {
  const lanes: LaneLists = new Map();
  const add = (v: Vehicle, lane: number) => {
    const k = laneKey(v.segment, lane);
    const list = lanes.get(k);
    if (list) list.push(v);
    else lanes.set(k, [v]);
  };
  for (const v of s.vehicles) {
    add(v, v.lane);
    // A vehicle moving over blocks both lanes until it has finished.
    if (v.targetLane !== null) add(v, v.targetLane);
  }
  for (const list of lanes.values()) list.sort((a, b) => b.x - a.x || a.id - b.id);
  return lanes;
}

/** Gap available at the start of a lane for a new vehicle of this length, or null if it doesn't fit. */
function entryGap(lanes: LaneLists, segment: string, lane: number, length: number, s0: number): number | null {
  const list = lanes.get(laneKey(segment, lane));
  const last = list?.[list.length - 1];
  const gap = last ? last.x - last.length - length : Infinity;
  return gap >= s0 ? gap : null;
}

function place(s: SimState, lanes: LaneLists, v: Vehicle, lane: number, gap: number): void {
  v.lane = lane;
  v.x = v.length;
  v.v = Math.min(v.v0, Number.isFinite(gap) ? Math.max(0, (gap - v.s0) / v.T) : v.v0);
  s.vehicles.push(v);
  const k = laneKey(v.segment, lane);
  const list = lanes.get(k);
  if (list) list.push(v);
  else lanes.set(k, [v]);
}

function releaseBacklog(s: SimState, lanes: LaneLists, p: SpawnPoint): void {
  const st = s.spawns[p.key];
  while (st.backlog.length > 0) {
    const v = st.backlog[0];
    let placed = false;
    for (let i = 0; i < p.arm.lanes && !placed; i++) {
      const lane = (v.lane + i) % p.arm.lanes;
      const gap = entryGap(lanes, p.segment, lane, v.length, v.s0);
      if (gap !== null) {
        place(s, lanes, v, lane, gap);
        placed = true;
      }
    }
    if (!placed) return; // first in, first out
    st.backlog.shift();
  }
}

function tryEnterAmbulance(cfg: SimConfig, s: SimState, lanes: LaneLists, system: boolean): void {
  const a = cfg.ambulance;
  const gap = entryGap(lanes, "route", cfg.middleLane, a.length, a.s0);
  if (gap === null) return;
  const v0 = system ? a.speedWithSystem : a.speedNoSystem;
  const amb: Vehicle = {
    id: s.nextId++,
    type: "ambulance",
    segment: "route",
    x: 0,
    v: 0,
    v0,
    length: a.length,
    s0: a.s0,
    T: a.T,
    lane: cfg.middleLane,
    targetLane: null,
    changeStart: null,
    reactAt: null,
    willTurn: false,
    admitted: null,
    compliesBlue: false,
    yieldsSiren: false,
    prefersRight: false,
  };
  place(s, lanes, amb, cfg.middleLane, gap);
  s.ambulanceId = amb.id;
  s.ambulance.enteredAt = s.t;
  s.nextGpsAt = s.t;
}

/** Which junction's blue light a route vehicle at x is looking at. */
function facingJunction(cfg: SimConfig, x: number): JunctionId | null {
  const [j1Stop, j2Stop] = cfg.segments.route.stops;
  if (x <= j1Stop.x) return "J1";
  if (x <= j2Stop.x) return "J2";
  return null;
}

function updateYielding(cfg: SimConfig, s: SimState, amb: Vehicle, system: boolean): void {
  const { reaction, laneChange, sirenRange } = cfg.driver;
  for (const v of s.vehicles) {
    if (v === amb || v.segment !== "route") continue;
    if (v.targetLane !== null && v.changeStart !== null && s.t - v.changeStart >= laneChange) {
      v.lane = v.targetLane;
      v.targetLane = null;
      v.changeStart = null;
    }
    if (v.lane !== cfg.middleLane || v.targetLane !== null) continue;
    if (v.reactAt === null && v.x > amb.x) {
      const j = facingJunction(cfg, v.x);
      const seesBlue = system && v.compliesBlue && j !== null && blue(s.controllers[j]) !== "off";
      const hearsSiren = v.yieldsSiren && v.x - v.length - amb.x <= sirenRange;
      if (seesBlue || hearsSiren) v.reactAt = s.t + reaction;
    }
    if (v.reactAt !== null && s.t >= v.reactAt) {
      v.targetLane = cfg.middleLane + (v.prefersRight ? 1 : -1);
      v.changeStart = s.t;
    }
  }
}

function accelerations(cfg: SimConfig, s: SimState, lanes: LaneLists, light: Record<JunctionId, Record<Role, Light>>): Map<number, number> {
  const p = { a: cfg.idm.a, b: cfg.idm.b, delta: cfg.idm.delta, s0: 0, T: 0 };
  const acc = new Map<number, number>();
  for (const list of lanes.values()) {
    for (let k = 0; k < list.length; k++) {
      const v = list[k];
      const leader = list[k - 1];
      p.s0 = v.s0;
      p.T = v.T;
      const a = leader
        ? idmAcceleration(v.v, v.v0, leader.x - leader.length - v.x, v.v - leader.v, p)
        : idmAcceleration(v.v, v.v0, Infinity, 0, p);
      acc.set(v.id, Math.min(acc.get(v.id) ?? Infinity, a));
    }
  }
  // Stop lines. The ambulance has right of way at signals in both modes; only traffic holds it up.
  for (const v of s.vehicles) {
    if (v.type === "ambulance") continue;
    const stop = cfg.segments[v.segment].stops.find((st) => v.x <= st.x);
    if (!stop) continue;
    const l = light[stop.junction][stop.role];
    const gap = stop.x - v.x;
    const stoppingDistance = (v.v * v.v) / (2 * cfg.idm.b);
    let mustStop: boolean;
    if (l === "RED") mustStop = true;
    else if (l === "AMBER") mustStop = v.admitted !== stop.junction && gap >= stoppingDistance;
    else mustStop = !admit(cfg, s, v, stop.junction, stop.role, gap <= stoppingDistance + v.v * cfg.dt + 1);
    if (!mustStop) continue;
    // Stop exactly at the line: a virtual obstacle STOP_MARGIN past it, with that as the jam gap.
    // (A zero jam gap lets IDM creep forward from standstill.)
    p.s0 = STOP_MARGIN;
    p.T = v.T;
    acc.set(v.id, Math.min(acc.get(v.id) ?? Infinity, idmAcceleration(v.v, v.v0, gap + STOP_MARGIN, v.v, p)));
  }
  return acc;
}

const budgetKey = (j: JunctionId, r: Role, lane: number) => `${j}.${r}.${lane}`;

/**
 * Stop-line capacity (S11). A sprite crosses on green only once its lane has built up enough
 * PCU-seconds of green; otherwise one 10-vehicle block would clear in a few seconds.
 * Returns whether the vehicle may go. Only vehicles close enough to commit are admitted.
 */
function admit(cfg: SimConfig, s: SimState, v: Vehicle, j: JunctionId, r: Role, committing: boolean): boolean {
  if (v.admitted === j) return true;
  if (!committing) return true; // still far away: keep driving, decide nearer the line
  const key = budgetKey(j, r, v.lane);
  const pcu = v.type === "ambulance" ? 0 : cfg.types[v.type].spritePcu;
  const budget = s.stopBudget[key] ?? 0;
  if (budget < pcu) return false;
  s.stopBudget[key] = budget - pcu;
  v.admitted = j;
  return true;
}

function accrueStopBudgets(cfg: SimConfig, s: SimState, light: Record<JunctionId, Record<Role, Light>>): void {
  const { pcuPerLaneSecond, carryCap } = cfg.stopLine;
  for (const j of JUNCTIONS) {
    for (const arm of Object.values(cfg.junctions[j].arms)) {
      if (light[j][arm.role] !== "GREEN") continue;
      for (let lane = 0; lane < arm.lanes; lane++) {
        const key = budgetKey(j, arm.role, lane);
        s.stopBudget[key] = Math.min(carryCap, (s.stopBudget[key] ?? 0) + pcuPerLaneSecond * cfg.dt);
      }
    }
  }
}

function updateStates(cfg: SimConfig, s: SimState, log: RunLog): void {
  const amb = s.vehicles.find((v) => v.id === s.ambulanceId);
  const set = (j: JunctionId, to: JunctionState) => {
    const c = s.controllers[j];
    if (c.state === to) return;
    log.events.push({ t: s.t, junction: j, from: c.state, to });
    transition(cfg, cfg.junctions[j], c, to, s.t);
  };
  const c1 = s.controllers.J1;
  const c2 = s.controllers.J2;
  if (c1.state === "NORMAL" && amb && s.ambulance.passedJ1At === null && cfg.junctions.J1.centreX - amb.x <= cfg.triggerDistance) {
    set("J1", "ALERT");
    set("J2", "PREWARN");
  }
  if (c1.state === "ALERT" && s.ambulance.passedJ1At !== null) {
    set("J1", "CLEARED");
    set("J2", "ALERT");
  }
  if (c2.state === "ALERT" && s.ambulance.passedJ2At !== null) set("J2", "CLEARED");
  for (const j of JUNCTIONS) {
    const c = s.controllers[j];
    if (c.state === "CLEARED" && s.t - c.since >= cfg.clearedDuration - 1e-9) set(j, "NORMAL");
  }
}

export function step(cfg: SimConfig, s: SimState, points: SpawnPoint[], system: boolean, log: RunLog): void {
  const lanes = buildLanes(s);

  // Entry: the ambulance goes first; route arrivals wait behind it if it is still waiting to get in.
  const ambulanceDue = s.ambulance.enteredAt === null && s.t >= cfg.warmUp;
  if (ambulanceDue) tryEnterAmbulance(cfg, s, lanes, system);
  const ambulanceWaiting = s.ambulance.enteredAt === null && s.t >= cfg.warmUp;
  for (const p of points) {
    collectArrivals(cfg, s, p);
    if (!(ambulanceWaiting && p.segment === "route")) releaseBacklog(s, lanes, p);
  }

  const light = {} as Record<JunctionId, Record<Role, Light>>;
  for (const j of JUNCTIONS) light[j] = lights(cfg, cfg.junctions[j], s.controllers[j], s.t);
  accrueStopBudgets(cfg, s, light);

  const amb = s.vehicles.find((v) => v.id === s.ambulanceId);
  if (amb) updateYielding(cfg, s, amb, system);

  const prev = amb ? { x: amb.x, v: amb.v } : null;
  const acc = accelerations(cfg, s, buildLanes(s), light);
  for (const v of s.vehicles) {
    const [vNext, dx] = integrate(v.v, acc.get(v.id) ?? 0, cfg.dt);
    v.v = vNext;
    v.x += dx;
  }

  s.step += 1;
  s.t = s.step * cfg.dt;

  // Ambulance milestones ("passed" = rear clears the far edge of the box).
  if (amb) {
    const rear = amb.x - amb.length;
    const far = (j: JunctionId) => cfg.junctions[j].centreX + cfg.junctions[j].boxDepth / 2;
    if (s.ambulance.passedJ1At === null && rear >= far("J1")) s.ambulance.passedJ1At = s.t;
    if (s.ambulance.passedJ2At === null && rear >= far("J2")) s.ambulance.passedJ2At = s.t;
  }

  s.vehicles = s.vehicles.filter((v) => {
    const end = v.willTurn ? cfg.j1FarEdge : cfg.segments[v.segment].endX;
    if (v.x < end) return true;
    if (v.id === s.ambulanceId) {
      s.ambulance.exitedAt = s.t;
      s.ambulanceId = null;
    }
    return false;
  });

  // Clocks first, so a junction that freezes this step has counted the time up to now.
  for (const j of JUNCTIONS) advanceClock(cfg.junctions[j], s.controllers[j], cfg.dt);
  if (system) updateStates(cfg, s, log);

  // GPS packets at exact interval times, interpolated within the step.
  const live = s.vehicles.find((v) => v.id === s.ambulanceId);
  while (live && prev && s.nextGpsAt !== null && s.nextGpsAt <= s.t + 1e-9) {
    const f = Math.min(1, Math.max(0, (s.nextGpsAt - (s.t - cfg.dt)) / cfg.dt));
    const x = prev.x + f * (live.x - prev.x);
    log.gps.push({
      t: s.nextGpsAt,
      x,
      speed: prev.v + f * (live.v - prev.v),
      headingDeg: null,
      distToJ1: cfg.junctions.J1.centreX - x,
      distToJ2: cfg.junctions.J2.centreX - x,
    });
    s.nextGpsAt += cfg.gpsInterval;
  }
}

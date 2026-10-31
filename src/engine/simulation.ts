// A full deterministic run with keyframes, so any time can be revisited (scrubbing backwards gives the same result).

import { initialController } from "./signals";
import { initialSpawns, spawnPoints, type SpawnPoint } from "./spawner";
import { step } from "./step";
import type { AmbulanceLog, RunLog, SimConfig, SimState } from "./types";

export interface RunResult {
  ambulance: AmbulanceLog;
  /** Entry to rear clearing J2's box; null if it never got there. */
  timeToClearJ2: number | null;
  /** Entry to leaving the drawn corridor. */
  travelTime: number | null;
  reachedEnd: boolean;
}

export function initialState(cfg: SimConfig, seed: number): SimState {
  return {
    step: 0,
    t: 0,
    nextId: 1,
    vehicles: [],
    ambulanceId: null,
    controllers: { J1: initialController(cfg.junctions.J1), J2: initialController(cfg.junctions.J2) },
    spawns: initialSpawns(cfg, seed),
    stopBudget: {},
    ambulance: { enteredAt: null, passedJ1At: null, passedJ2At: null, exitedAt: null },
    nextGpsAt: null,
  };
}

export class Simulation {
  readonly cfg: SimConfig;
  readonly system: boolean;
  readonly seed: number;
  readonly log: RunLog = { gps: [], events: [] };
  /** Real seconds covered by the run. */
  readonly duration: number;
  readonly result: RunResult;

  private readonly points: SpawnPoint[];
  private readonly keyframes: SimState[] = [];
  private readonly stepsPerKeyframe: number;
  private readonly lastStep: number;
  private cursor: SimState | null = null;

  constructor(cfg: SimConfig, opts: { system: boolean; seed?: number }) {
    this.cfg = cfg;
    this.system = opts.system;
    this.seed = opts.seed ?? cfg.seed;
    this.points = spawnPoints(cfg);
    this.stepsPerKeyframe = Math.max(1, Math.round(cfg.keyframeInterval / cfg.dt));

    const s = initialState(cfg, this.seed);
    const maxSteps = Math.ceil(cfg.maxDuration / cfg.dt);
    // Run until the ambulance has left and both junctions are back to NORMAL.
    const done = () =>
      s.ambulance.exitedAt !== null && s.controllers.J1.state === "NORMAL" && s.controllers.J2.state === "NORMAL";
    while (s.step < maxSteps && !done()) {
      if (s.step % this.stepsPerKeyframe === 0) this.keyframes.push(structuredClone(s));
      step(cfg, s, this.points, this.system, this.log);
    }
    if (s.step % this.stepsPerKeyframe === 0) this.keyframes.push(structuredClone(s));
    this.lastStep = s.step;
    this.duration = s.t;

    const a = s.ambulance;
    this.result = {
      ambulance: { ...a },
      timeToClearJ2: a.enteredAt !== null && a.passedJ2At !== null ? a.passedJ2At - a.enteredAt : null,
      travelTime: a.enteredAt !== null && a.exitedAt !== null ? a.exitedAt - a.enteredAt : null,
      reachedEnd: a.exitedAt !== null,
    };
  }

  /**
   * State at the last step at or before real time t. The returned object is reused:
   * it is valid until the next call, and must not be mutated.
   */
  at(t: number): Readonly<SimState> {
    const target = Math.max(0, Math.min(this.lastStep, Math.floor(t / this.cfg.dt + 1e-9)));
    const kfIndex = Math.floor(target / this.stepsPerKeyframe);
    const kfStep = kfIndex * this.stepsPerKeyframe;
    const canContinue = this.cursor !== null && this.cursor.step <= target && this.cursor.step >= kfStep;
    if (!canContinue) this.cursor = structuredClone(this.keyframes[kfIndex]);
    const s = this.cursor!;
    const scratch: RunLog = { gps: [], events: [] }; // already recorded in this.log
    while (s.step < target) step(this.cfg, s, this.points, this.system, scratch);
    return s;
  }
}

/** Same scenario, same seed, with and without the system. */
export function compare(cfg: SimConfig, seed?: number) {
  const without = new Simulation(cfg, { system: false, seed });
  const withSystem = new Simulation(cfg, { system: true, seed });
  const a = without.result.travelTime;
  const b = withSystem.result.travelTime;
  return { without, withSystem, timeSaved: a !== null && b !== null ? a - b : null };
}

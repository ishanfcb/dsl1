// When the ambulance reached each phase of its run, read from the engine's GPS log.
import type { Simulation } from "../engine";

export const PHASES = ["Approaching J1", "Passed J1", "Approaching J2", "Passed J2"] as const;

export interface RunMarks {
  /** Seconds after entry for each phase in PHASES; null if the run never got there. */
  ticks: (number | null)[];
  /** Seconds from entry to leaving the corridor. */
  end: number;
}

/** Time the ambulance reached route coordinate x, interpolated between GPS packets. */
function timeAtX(sim: Simulation, x: number): number | null {
  const g = sim.log.gps;
  for (let i = 1; i < g.length; i++) {
    if (g[i].x >= x) {
      const f = (x - g[i - 1].x) / Math.max(1e-9, g[i].x - g[i - 1].x);
      return g[i - 1].t + f * (g[i].t - g[i - 1].t);
    }
  }
  return null;
}

/**
 * Phase moments of a run. Approaching J1 = enters J1's trigger radius (J1 starts blinking);
 * Approaching J2 = J2 starts blinking, which by the n+1 rule is the moment it passes J1.
 * The run without the system uses the same positions, so the two lines compare like for like.
 */
export function runMarks(sim: Simulation): RunMarks {
  const a = sim.result.ambulance;
  const t0 = a.enteredAt ?? 0;
  const rel = (t: number | null) => (t === null ? null : t - t0);
  const j1 = sim.cfg.junctions.J1.centreX;
  return {
    ticks: [rel(timeAtX(sim, j1 - sim.cfg.triggerDistance)), rel(a.passedJ1At), rel(a.passedJ1At), rel(a.passedJ2At)],
    end: rel(a.exitedAt) ?? sim.duration - t0,
  };
}

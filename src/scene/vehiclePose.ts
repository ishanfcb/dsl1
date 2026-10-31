// Where an engine vehicle is drawn: the middle of its body, on its (possibly changing) lane.
import type { SimConfig, SimState, Vehicle } from "../engine";
import type { Corridor } from "../geo/corridor";
import type { Pose } from "../geo/polyline";

/** Fractional lane while a driver moves over, so ribbons slide sideways instead of jumping. */
export function drawnLane(v: Vehicle, cfg: SimConfig, t: number): number {
  if (v.targetLane === null || v.changeStart === null) return v.lane;
  const u = Math.min(1, Math.max(0, (t - v.changeStart) / cfg.driver.laneChange));
  return v.lane + (v.targetLane - v.lane) * u;
}

export function vehiclePose(v: Vehicle, cfg: SimConfig, corridor: Corridor, t: number): Pose {
  return corridor.pose(v.segment, v.x - v.length / 2, drawnLane(v, cfg, t));
}

export function ambulanceOf(s: Readonly<SimState>): Vehicle | null {
  if (s.ambulanceId === null) return null;
  return s.vehicles.find((v) => v.id === s.ambulanceId) ?? null;
}

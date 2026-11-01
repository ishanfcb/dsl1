// Where an engine vehicle is drawn: the middle of its body, on its lane.
import type { SimState, Vehicle } from "../engine";
import type { Corridor } from "../geo/corridor";
import type { Pose } from "../geo/polyline";

export function vehiclePose(v: Vehicle, corridor: Corridor): Pose {
  return corridor.pose(v.segment, v.x - v.length / 2, v.lane);
}

export function ambulanceOf(s: Readonly<SimState>): Vehicle | null {
  if (s.ambulanceId === null) return null;
  return s.vehicles.find((v) => v.id === s.ambulanceId) ?? null;
}

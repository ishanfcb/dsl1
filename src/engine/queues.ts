// Queues at a junction's four approaches, read from engine state. Display only: the simulation never uses this.
import { ROLES, type JunctionId, type Role, type SegmentId, type SimConfig, type SimState, type Vehicle } from "./types";

export interface ArmQueue {
  /** Stop line back to the rear of the last queued sprite, in the longest lane (m). */
  length: number;
  /** Real vehicles queued across all lanes (sprites × vehiclesPerSprite). */
  vehicles: number;
}

export function approachSegment(j: JunctionId, role: Role): SegmentId {
  return role === "in" ? "route" : `${j}.${role}`;
}

/**
 * A lane's queue starts at the stop line and runs back while each sprite is slower than `queuedBelow` (m/s)
 * (global.queue.queuedBelow_kmh). Sprites already past the stop line are not queued.
 */
export function junctionQueues(cfg: SimConfig, s: Readonly<SimState>, j: JunctionId, queuedBelow: number): Record<Role, ArmQueue> {
  const out = {} as Record<Role, ArmQueue>;
  for (const role of ROLES) {
    const segment = approachSegment(j, role);
    const stop = cfg.segments[segment].stops.find((st) => st.junction === j)!;
    // On the route, J2's approach starts where J1's box ends.
    const from = segment === "route" && j === "J2" ? cfg.j1FarEdge : -Infinity;
    const lanes = new Map<number, Vehicle[]>();
    for (const v of s.vehicles) {
      if (v.segment !== segment || v.type === "ambulance" || v.x > stop.x + 0.5 || v.x <= from) continue;
      const list = lanes.get(v.lane);
      if (list) list.push(v);
      else lanes.set(v.lane, [v]);
    }
    let length = 0;
    let sprites = 0;
    for (const list of lanes.values()) {
      list.sort((a, b) => b.x - a.x);
      let rear = stop.x;
      for (const v of list) {
        if (v.v >= queuedBelow) break;
        rear = v.x - v.length;
        sprites++;
      }
      length = Math.max(length, stop.x - rear);
    }
    out[role] = { length, vehicles: sprites * cfg.vehiclesPerSprite };
  }
  return out;
}

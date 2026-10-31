// Map metres (x east, y north) → three.js world (x east, y up, z south).
import { Vector3 } from "three";
import type { XY } from "../geo/project";

export function toWorld(p: XY, height = 0, out = new Vector3()): Vector3 {
  return out.set(p[0], height, -p[1]);
}

/** Rotation about the vertical axis that points local +x along a map direction. */
export function headingY(dir: XY): number {
  return Math.atan2(dir[1], dir[0]);
}

/** Blink phase for ALERT: wall-clock, not engine time, so it stays a calm 1 Hz at any playback speed. */
export function blinkOn(nowMs: number): boolean {
  return nowMs % 1000 < 600;
}

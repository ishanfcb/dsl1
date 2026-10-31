// A polyline with arc length, so a 1D distance can be placed on a real road.
import type { XY } from "./project";

export interface Pose {
  p: XY;
  /** Unit direction of travel. */
  dir: XY;
}

export class Polyline {
  readonly pts: XY[];
  readonly cum: number[];
  readonly length: number;

  constructor(pts: XY[]) {
    if (pts.length < 2) throw new Error("Polyline needs at least two points");
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  reversed(): Polyline {
    return new Polyline([...this.pts].reverse());
  }

  /** Point and direction at arc length s. Beyond either end it continues straight along the end segment. */
  at(s: number): Pose {
    const n = this.pts.length;
    let i = 1;
    if (s >= this.length) i = n - 1;
    else if (s > 0) {
      let lo = 1;
      let hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (this.cum[mid] < s) lo = mid + 1;
        else hi = mid;
      }
      i = lo;
    }
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const segLen = this.cum[i] - this.cum[i - 1];
    const dir: XY = [(b[0] - a[0]) / segLen, (b[1] - a[1]) / segLen];
    const u = s - this.cum[i - 1];
    return { p: [a[0] + dir[0] * u, a[1] + dir[1] * u], dir };
  }

  /** Arc length of the closest point on the line to q. */
  project(q: XY): { s: number; dist: number } {
    let best = { s: 0, dist: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1];
      const b = this.pts[i];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2));
      const dist = Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1]);
      if (dist < best.dist) best = { s: this.cum[i - 1] + t * Math.sqrt(len2), dist };
    }
    return best;
  }

  /** Points from s0 to s1 (s0 < s1), including the interior vertices. */
  slice(s0: number, s1: number): XY[] {
    const out: XY[] = [this.at(s0).p];
    for (let i = 0; i < this.pts.length; i++) {
      if (this.cum[i] > s0 && this.cum[i] < s1) out.push(this.pts[i]);
    }
    out.push(this.at(s1).p);
    return out;
  }
}

/** Offsets a pose sideways: positive = to the right of the direction of travel. */
export function offsetRight(pose: Pose, d: number): XY {
  return [pose.p[0] + pose.dir[1] * d, pose.p[1] - pose.dir[0] * d];
}

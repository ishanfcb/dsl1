// Where a junction's cross arm runs on the map: the OSM road leaving the junction on that side, followed
// outward through the road network (straightest way on at every node) for as far as the arm is drawn.
// Returns null where no mapped road leaves on that side; the caller then draws the arm straight.
import { Polyline } from "./polyline";
import type { XY } from "./project";

/** Road vertices this far from the junction centre (m) can start an arm. Beyond a few metres that is a staggered
 *  junction, whose cross road meets the main road a little way along; the arm then jogs from the centre to it. */
const STAGGER_RADIUS = 70;
/** The first edge must point this much along the side (cosine), so an arm never starts down the main road. */
const START_ALIGN = 0.7;
/** An arm must lead on to at least this much mapped road (m); shorter stubs are skipped. */
const MIN_ROAD = 60;
/** At each node, carry on only along an edge within this turn of the current heading (cosine of 60 degrees). */
const CONTINUE_ALIGN = 0.5;

interface Graph {
  pts: XY[];
  next: number[][];
  /** OSM highway class of the edge between two nodes, keyed "a|b" (a < b). */
  highway: Map<string, string>;
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function roadGraph(roads: { id: string; highway: string; pts: XY[] }[], exclude: Set<string>): Graph {
  const highway = new Map<string, string>();
  const index = new Map<string, number>();
  const pts: XY[] = [];
  const next: number[][] = [];
  const node = (p: XY) => {
    const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    let i = index.get(key);
    if (i === undefined) {
      i = pts.length;
      index.set(key, i);
      pts.push(p);
      next.push([]);
    }
    return i;
  };
  for (const r of roads) {
    if (exclude.has(r.id)) continue;
    for (let k = 1; k < r.pts.length; k++) {
      const a = node(r.pts[k - 1]);
      const b = node(r.pts[k]);
      if (a === b) continue;
      next[a].push(b);
      next[b].push(a);
      highway.set(edgeKey(a, b), r.highway);
    }
  }
  return { pts, next, highway };
}

const unit = (a: XY, b: XY): XY => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};
const dot = (a: XY, b: XY) => a[0] * b[0] + a[1] * b[1];

export interface CrossArm {
  /** From the junction centre outward. */
  line: Polyline;
  /** OSM highway class of the road it follows, at the junction end. */
  highway: string;
}

/** The arm from the junction centre outward along `side` (unit vector), at least `reach` long, or null. */
export function crossArmLine(g: Graph, centre: XY, side: XY, reach: number): CrossArm | null {
  // Candidate first edges, nearest the centre first. A short stub that stops at the far carriageway does not
  // count: take the nearest edge that leads on to at least MIN_ROAD of mapped road.
  const starts: { from: number; to: number; d: number }[] = [];
  g.pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - centre[0], p[1] - centre[1]);
    if (d > STAGGER_RADIUS) return;
    for (const j of g.next[i]) {
      const outward = Math.hypot(g.pts[j][0] - centre[0], g.pts[j][1] - centre[1]) > d;
      if (outward && dot(unit(p, g.pts[j]), side) >= START_ALIGN) starts.push({ from: i, to: j, d });
    }
  });
  starts.sort((a, b) => a.d - b.d);
  for (const { from, to, d } of starts) {
    const { pts, mapped } = follow(g, from, to, reach - d);
    if (mapped < MIN_ROAD) continue;
    // The centre and the first road vertex can coincide.
    const line = [centre, ...pts].filter((q, k, all) => k === 0 || Math.hypot(q[0] - all[k - 1][0], q[1] - all[k - 1][1]) > 0.01);
    if (line.length >= 2) return { line: new Polyline(line), highway: g.highway.get(edgeKey(from, to)) ?? "" };
  }
  return null;
}

/** Walks outward from edge from -> to, straightest way on at each node, until `reach` or a dead end. */
function follow(g: Graph, from: number, to: number, reach: number): { pts: XY[]; mapped: number } {
  const pts: XY[] = [g.pts[from]];
  let prev = from;
  let cur = to;
  let mapped = 0;
  const seen = new Set([from]);
  while (true) {
    mapped += Math.hypot(g.pts[cur][0] - g.pts[prev][0], g.pts[cur][1] - g.pts[prev][1]);
    pts.push(g.pts[cur]);
    seen.add(cur);
    if (mapped >= reach) break;
    const heading = unit(g.pts[prev], g.pts[cur]);
    let pick = -1;
    let pickAlign = CONTINUE_ALIGN;
    for (const j of g.next[cur]) {
      if (seen.has(j)) continue;
      const align = dot(unit(g.pts[cur], g.pts[j]), heading);
      if (align >= pickAlign) {
        pick = j;
        pickAlign = align;
      }
    }
    if (pick < 0) break; // dead end: Polyline.at carries on straight past the last point
    prev = cur;
    cur = pick;
  }
  return { pts, mapped };
}

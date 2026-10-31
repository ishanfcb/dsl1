// Extruded OSM footprints merged into one mesh, plus one merged outline geometry.
// World axes (three.js): x = east, y = up, z = south.
import { BufferGeometry, EdgesGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { XY } from "./project";

export interface Footprint {
  rings: XY[][];
  height: number;
}

/** Edges sharper than this become outlines; keeps curved footprints from drawing every facet. */
const EDGE_THRESHOLD_DEG = 25;

function ringPoints(ring: XY[]): Vector2[] {
  const pts = ring.map(([x, y]) => new Vector2(x, y));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (pts.length > 1 && first.equals(last)) pts.pop();
  return pts;
}

export function buildCity(footprints: Footprint[]): { solids: BufferGeometry; edges: BufferGeometry } {
  const solids: BufferGeometry[] = [];
  const edges: BufferGeometry[] = [];
  for (const f of footprints) {
    const outer = ringPoints(f.rings[0]);
    if (outer.length < 3) continue;
    const shape = new Shape(outer);
    for (const hole of f.rings.slice(1)) shape.holes.push(new Path(ringPoints(hole)));
    const g = new ExtrudeGeometry(shape, { depth: f.height, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); // (east, north, up) → (east, up, south)
    solids.push(g);
    edges.push(new EdgesGeometry(g, EDGE_THRESHOLD_DEG));
  }
  const merged = { solids: mergeGeometries(solids)!, edges: mergeGeometries(edges)! };
  for (const g of [...solids, ...edges]) g.dispose();
  return merged;
}

// Places the engine's 1D segments on the OSM roads of one scenario.
// The engine route runs straight; here each engine coordinate becomes a point on a real carriageway.
import { at, num, scenarioById, type Lookup } from "../engine/data";
import { JUNCTIONS, type JunctionId, type SegmentId, type SimConfig } from "../engine/types";
import { crossArmLine, roadGraph, type CrossArm } from "./crossArms";
import { buildingHeight, type HeightRules } from "./heights";
import { parseOsm, type OsmData } from "./osm";
import { offsetRight, Polyline, type Pose } from "./polyline";
import { makeProjection, type LonLat, type Projection, type XY } from "./project";
import type { Footprint } from "./buildings";

export interface MapRoad {
  id: string;
  highway: string;
  pts: XY[];
}

export interface Corridor {
  project: Projection;
  /** The ambulance's carriageway, in travel direction. */
  route: Polyline;
  /** The opposite carriageway, in its own travel direction. */
  opposing: Polyline;
  junctionS: Record<JunctionId, number>;
  junctionXY: Record<JunctionId, XY>;
  /** J1 → J2 centre distance measured along the OSM route. */
  measuredJ1ToJ2: number;
  /** geometry.laneWidth_m: how far apart lanes are drawn. */
  laneWidth: number;
  footprints: Footprint[];
  roads: MapRoad[];
  /** Engine route coordinate → arc length on `route`. */
  routeS(x: number): number;
  /** World pose of a vehicle's lane centre. `lane` may be fractional while changing lanes. */
  pose(segment: SegmentId, x: number, lane: number): Pose;
}

/** OSM highway types that are not roads for traffic: a cross arm never follows these. */
const NOT_TRAFFIC = new Set(["footway", "path", "pedestrian", "steps", "cycleway", "bridleway", "corridor", "track", "service"]);

const list = (ctx: Lookup, path: string) => (at(ctx, path) as { value: string[] }).value;
/** One way id, or several that join end to end (a carriageway OSM splits into pieces). */
const ways = (ctx: Lookup, path: string) => {
  const v = (at(ctx, path) as { value: string | string[] }).value;
  return typeof v === "string" ? [v] : v;
};

/** Joins ways in the order given into one carriageway. Each must start where the previous one ends. */
function chainWays(osm: OsmData, ids: string[]): LonLat[] {
  const pts: LonLat[] = [];
  for (const id of ids) {
    const w = osm.way(id).pts;
    if (pts.length) {
      const [a, b] = [pts[pts.length - 1], w[0]];
      if (a[0] !== b[0] || a[1] !== b[1]) throw new Error(`OSM way ${id} does not start where the previous way ends`);
    }
    pts.push(...(pts.length ? w.slice(1) : w));
  }
  return pts;
}

function junctionArcLength(osm: OsmData, route: Polyline, project: Projection, wayIds: string[]): number {
  const hits = wayIds.map((id) => {
    let best = { s: 0, dist: Infinity };
    for (const p of osm.way(id).pts) {
      const h = route.project(project(p));
      if (h.dist < best.dist) best = h;
    }
    if (best.dist > 5) throw new Error(`OSM way ${id} does not meet the route (closest ${best.dist.toFixed(1)} m)`);
    return best.s;
  });
  return hits.reduce((a, b) => a + b, 0) / hits.length;
}

export function buildCorridor(root: unknown, scenarioId: string, cfg: SimConfig, osmText: string): Corridor {
  const rootNode = root as Record<string, unknown>;
  const ctx: Lookup = { root: rootNode, scenario: scenarioById(rootNode, scenarioId) };
  const o = "geometry.osm";
  const osm = parseOsm(osmText);
  const routePts = chainWays(osm, ways(ctx, `${o}.routeWay`));
  const opposingPts = chainWays(osm, ways(ctx, `${o}.opposingWay`));
  const jWays = Object.fromEntries(JUNCTIONS.map((j) => [j, list(ctx, `${o}.junctionWays.${j}`)])) as Record<JunctionId, string[]>;

  // Two passes: find the junctions, then centre the projection between them.
  const locate = (project: Projection) => {
    const route = new Polyline(routePts.map(project));
    const junctionS = Object.fromEntries(
      JUNCTIONS.map((j) => [j, junctionArcLength(osm, route, project, jWays[j])]),
    ) as Record<JunctionId, number>;
    return { route, junctionS };
  };
  const first = makeProjection(routePts[0]);
  const draft = locate(first);
  const a = draft.route.at(draft.junctionS.J1).p;
  const b = draft.route.at(draft.junctionS.J2).p;
  const centre: LonLat = first.invert([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  const project = makeProjection(centre);
  const { route, junctionS } = locate(project);
  const opposing = new Polyline(opposingPts.map(project));
  const junctionXY = { J1: route.at(junctionS.J1).p, J2: route.at(junctionS.J2).p };

  // Engine and map must agree on J1 → J2 (CLAUDE.md §8). Never stretch the drawing.
  const measuredJ1ToJ2 = junctionS.J2 - junctionS.J1;
  const engineJ1ToJ2 = cfg.junctions.J2.centreX - cfg.junctions.J1.centreX;
  const tolerance = num(ctx, `${o}.j1ToJ2Tolerance_m`);
  if (Math.abs(measuredJ1ToJ2 - engineJ1ToJ2) > tolerance) {
    throw new Error(
      `${scenarioId}: OSM J1→J2 is ${measuredJ1ToJ2.toFixed(1)} m but geometry.j1ToJ2_m is ${engineJ1ToJ2} m. Update scenarios.json.`,
    );
  }
  const routeS = (x: number) => junctionS.J1 + (x - cfg.junctions.J1.centreX);
  const opposingS = Object.fromEntries(
    JUNCTIONS.map((j) => [j, opposing.project(junctionXY[j]).s]),
  ) as Record<JunctionId, number>;

  const laneWidth = num(ctx, "geometry.laneWidth_m");
  const across = (lane: number, lanes: number) => (lane - (lanes - 1) / 2) * laneWidth;

  // Cross arms on the real cross roads (geometry.osm.crossArms), from the junction centre outward.
  const traffic = osm.roads.filter((r) => !NOT_TRAFFIC.has(String(r.tags.highway)));
  const mainWays = new Set([...ways(ctx, `${o}.routeWay`), ...ways(ctx, `${o}.opposingWay`)]);
  const graph = roadGraph(traffic.map((r) => ({ id: r.id, highway: String(r.tags.highway), pts: r.pts.map(project) })), mainWays);
  const armLines = {} as Record<`${JunctionId}.${"left" | "right"}`, CrossArm | null>;
  // Drawing only: an arm's inbound lanes are squeezed to fit the mapped street (global.crossArmDrawing).
  const maxHalf = at(ctx, "global.crossArmDrawing.maxHalfWidth_m") as Record<string, unknown>;
  const halfWidthFor = (highway: string) => num(ctx, maxHalf[highway] ?? maxHalf.other);
  for (const jid of JUNCTIONS) {
    const d = route.at(junctionS[jid]).dir;
    for (const role of ["left", "right"] as const) {
      const seg = cfg.segments[`${jid}.${role}`];
      const side: XY = role === "left" ? [-d[1], d[0]] : [d[1], -d[0]];
      armLines[`${jid}.${role}`] = crossArmLine(graph, junctionXY[jid], side, seg.stops[0].x + (seg.endX - seg.stops[0].x) / 2);
    }
  }

  const pose = (segment: SegmentId, x: number, lane: number): Pose => {
    const seg = cfg.segments[segment];
    if (segment === "route") {
      const base = route.at(routeS(x));
      return { p: offsetRight(base, across(lane, seg.lanes)), dir: base.dir };
    }
    const [jid, role] = segment.split(".") as [JunctionId, "out" | "left" | "right"];
    const j = cfg.junctions[jid];
    const stopX = seg.stops[0].x;
    if (role === "out") {
      const base = opposing.at(opposingS[jid] - j.boxDepth / 2 - stopX + x);
      return { p: offsetRight(base, across(lane, seg.lanes)), dir: base.dir };
    }
    // Cross arms, keeping left (geometry.osm.crossArms). u = distance out from the junction centre; inside the
    // box (u < 0) the line carries on straight across.
    const halfCrossing = (seg.endX - stopX) / 2;
    const arm = armLines[`${jid}.${role}`];
    if (arm) {
      const out = arm.line.at(stopX + halfCrossing - x);
      const base: Pose = { p: out.p, dir: [-out.dir[0], -out.dir[1]] };
      const spacing = Math.min(laneWidth, halfWidthFor(arm.highway) / seg.lanes);
      return { p: offsetRight(base, -spacing * seg.lanes + spacing * (lane + 0.5)), dir: base.dir };
    }
    // No mapped road on this side: straight, at right angles to the route.
    const d = route.at(junctionS[jid]).dir;
    const side: XY = role === "left" ? [-d[1], d[0]] : [d[1], -d[0]];
    const c = junctionXY[jid];
    const start: XY = [c[0] + side[0] * (stopX + halfCrossing), c[1] + side[1] * (stopX + halfCrossing)];
    const dir: XY = [-side[0], -side[1]];
    const base: Pose = { p: [start[0] + dir[0] * x, start[1] + dir[1] * x], dir };
    return { p: offsetRight(base, -(seg.lanes * laneWidth) / 2 + across(lane, seg.lanes)), dir };
  };

  const rules: HeightRules = {
    metresPerLevel: num(ctx, "global.buildings.metresPerLevel"),
    randomRange: (at(ctx, "global.buildings.randomHeightRange_m") as { value: [number, number] }).value,
    seed: num(ctx, "global.simulation.seed"),
  };
  const footprints = osm.buildings.map((bld) => ({
    rings: bld.rings.map((r) => r.map(project)),
    height: buildingHeight(bld, rules),
  }));
  const roads = osm.roads.map((r) => ({ id: r.id, highway: String(r.tags.highway), pts: r.pts.map(project) }));

  return { project, route, opposing, junctionS, junctionXY, measuredJ1ToJ2, laneWidth, footprints, roads, routeS, pose };
}

/** Which /data/osm file a scenario uses. */
export function osmFileFor(root: unknown, scenarioId: string): string {
  const rootNode = root as Record<string, unknown>;
  const scenario = scenarioById(rootNode, scenarioId) as { geometry?: { osm?: { file?: string } } };
  const file = scenario.geometry?.osm?.file;
  if (!file) throw new Error(`${scenarioId}: no geometry.osm.file in scenarios.json`);
  return file;
}

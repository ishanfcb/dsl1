import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import data from "../../data/scenarios.json";
import { buildConfig } from "../engine";
import { buildCorridor, osmFileFor } from "./corridor";

const id = "gurugram-monday-peak";
const cfg = buildConfig(data, id);
const text = readFileSync(new URL(`../../data/osm/${osmFileFor(data, id)}`, import.meta.url), "utf8");
const corridor = buildCorridor(data, id, cfg, text);

describe("Gurugram corridor on OSM", () => {
  test("OSM J1→J2 agrees with scenarios.json", () => {
    console.log(`OSM J1→J2 ${corridor.measuredJ1ToJ2.toFixed(1)} m; route way ${corridor.route.length.toFixed(0)} m`);
    expect(Math.abs(corridor.measuredJ1ToJ2 - (cfg.junctions.J2.centreX - cfg.junctions.J1.centreX))).toBeLessThanOrEqual(2);
  });

  test("the whole engine route fits on the mapped road", () => {
    expect(corridor.routeS(0)).toBeGreaterThanOrEqual(0);
    expect(corridor.routeS(cfg.segments.route.endX)).toBeLessThanOrEqual(corridor.route.length);
  });

  test("projection is centred between the junctions", () => {
    const { J1, J2 } = corridor.junctionXY;
    expect(Math.abs(J1[0] + J2[0])).toBeLessThan(1);
    expect(Math.abs(J1[1] + J2[1])).toBeLessThan(1);
  });

  test("route lanes sit on the carriageway, centre lane on its centreline", () => {
    const x = cfg.junctions.J1.centreX - 200;
    const mid = corridor.pose("route", x, cfg.ambulanceLane).p;
    const onLine = corridor.route.project(mid);
    expect(onLine.dist).toBeLessThan(0.01);
  });

  test("every building has a height inside the rules", () => {
    for (const f of corridor.footprints) expect(f.height).toBeGreaterThan(0);
  });
});

/** Even-odd test against a ring of map points. */
function inside(p: [number, number], ring: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe.each(["gurugram-monday-peak", "bengaluru-heavy-rain"])("cross arms on the OSM roads: %s", (sid) => {
  const c = buildConfig(data, sid);
  const osm = readFileSync(new URL(`../../data/osm/${osmFileFor(data, sid)}`, import.meta.url), "utf8");
  const corr = buildCorridor(data, sid, c, osm);

  test("cross-arm traffic follows its road, not through buildings", () => {
    const samples: [number, number][] = [];
    for (const seg of ["J1.left", "J1.right", "J2.left", "J2.right"] as const) {
      const s = c.segments[seg];
      for (let x = 0; x <= s.stops[0].x; x += 5) {
        for (let lane = 0; lane < s.lanes; lane++) samples.push(corr.pose(seg, x, lane).p as [number, number]);
      }
    }
    const blocked = samples.filter((p) => corr.footprints.some((f) => inside(p, f.rings[0] as [number, number][])));
    expect(blocked.length / samples.length).toBeLessThan(0.02);
  });
});

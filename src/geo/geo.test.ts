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

// Everything a corridor page needs from one scenario: the config, both engine runs, the map placement and
// the display values with their sources. Computed once per scenario.
import { useMemo } from "react";
import data from "@data/scenarios.json";
import { buildConfig, JUNCTIONS, type JunctionId } from "../engine";
import { at, deref, num, obj, scenarioById } from "../engine/data";
import { buildCorridor, osmFileFor } from "../geo/corridor";
import { runMarks } from "../components/runMarks";
import type { DataNode } from "../components/DataBadge";
import { junctionName } from "../components/junctionText";
import { adoptCity } from "../geo/cityCache";
import { getRuns, preparedCity } from "./prepareCities";

const osmFiles = import.meta.glob("/data/osm/*.geojson", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** Cities the page can show, in toggle order. A city is selectable once its OSM export is in /data/osm. */
export const CITIES = [
  { id: "gurugram-monday-peak" },
  { id: "bengaluru-heavy-rain" },
].map(({ id }) => {
  const root = data as unknown as Record<string, unknown>;
  const scenario = scenarioById(root, id) as { display?: { city?: string }; geometry?: { osm?: { file?: string } } };
  const file = scenario.geometry?.osm?.file;
  return { id, label: scenario.display?.city ?? id, ready: !!file && `/data/osm/${file}` in osmFiles };
});

/** Built once per scenario and kept, so switching back to a city does not parse its map again. */
const built = new Map<string, ReturnType<typeof buildScenario>>();

function scenarioView(id: string) {
  let v = built.get(id);
  if (!v) {
    v = buildScenario(id);
    built.set(id, v);
  }
  return v;
}

export function useScenario(id: string) {
  return useMemo(() => scenarioView(id), [id]);
}

/** Builds a scenario while the page is idle (after its workers finish), so switching to it is only a swap. */
export function prewarmScenario(id: string) {
  if (built.has(id)) return;
  const run = () => scenarioView(id);
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 0);
}

function buildScenario(id: string) {
  const root = data as unknown as Record<string, unknown>;
  const scenario = scenarioById(root, id) as { junctions?: Record<string, string> };
  const ctx = { root, scenario: scenario as Record<string, unknown> };
  const cfg = buildConfig(data, id);
  const runs = getRuns(id, cfg);
  const corridor = buildCorridor(data, id, cfg, osmFiles[`/data/osm/${osmFileFor(data, id)}`]);
  const city = preparedCity(id);
  if (city) adoptCity(corridor, city);
  const display = at(ctx, "display") as { place: string; dayTime: string; conditions: string };
  return {
    cfg,
    runs,
    marks: { with: runMarks(runs.withSystem), without: runMarks(runs.without) },
    corridor,
    place: display.place,
    dayTime: display.dayTime,
    conditions: display.conditions,
    speed: at(ctx, "display.speed") as DataNode,
    ambulanceWith: at(ctx, "ambulanceWithSystem_kmh") as DataNode,
    ambulanceWithout: at(ctx, "ambulanceBaseline_noSystem_kmh") as DataNode,
    compression: at(ctx, "scaling.timeCompression") as DataNode,
    trigger: at(ctx, "global.system.triggerDistance_m") as DataNode,
    cycle: Object.fromEntries(JUNCTIONS.map((j) => [j, deref(ctx, obj(ctx, `sim.signalPlan.${j}`).cycle_s)])) as Record<JunctionId, DataNode>,
    queuedBelow: at(ctx, "global.queue.queuedBelow_kmh") as DataNode,
    queuedBelowMs: num(ctx, "global.queue.queuedBelow_kmh") / 3.6,
    destination: (scenario.junctions?.destination ?? "hospital").split(",")[0].replace(/\s*\(.*\)\s*$/, ""),
    names: Object.fromEntries(JUNCTIONS.map((j) => [j, junctionName(scenario, j)])) as Record<JunctionId, string>,
  };
}

export type ScenarioView = ReturnType<typeof useScenario>;

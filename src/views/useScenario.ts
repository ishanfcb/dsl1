// Everything a corridor page needs from one scenario: the config, both engine runs, the map placement and
// the display values with their sources. Computed once per scenario.
import { useMemo } from "react";
import data from "@data/scenarios.json";
import { buildConfig, compare, JUNCTIONS, type JunctionId } from "../engine";
import { at, deref, num, obj, scenarioById } from "../engine/data";
import { buildCorridor, osmFileFor } from "../geo/corridor";
import { runMarks } from "../components/PhaseTimeline";
import type { DataNode } from "../components/DataBadge";
import { junctionName } from "../components/junctionText";

const osmFiles = import.meta.glob("/data/osm/*.geojson", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export function useScenario(id: string) {
  return useMemo(() => {
    const root = data as unknown as Record<string, unknown>;
    const scenario = scenarioById(root, id) as { junctions?: Record<string, string> };
    const ctx = { root, scenario: scenario as Record<string, unknown> };
    const cfg = buildConfig(data, id);
    const runs = compare(cfg);
    const corridor = buildCorridor(data, id, cfg, osmFiles[`/data/osm/${osmFileFor(data, id)}`]);
    const display = at(ctx, "display") as { place: string; dayTime: string };
    return {
      cfg,
      runs,
      marks: { with: runMarks(runs.withSystem), without: runMarks(runs.without) },
      corridor,
      place: display.place,
      dayTime: display.dayTime,
      speed: at(ctx, "display.speed") as DataNode,
      ambulanceWith: at(ctx, "ambulanceWithSystem_kmh") as DataNode,
      ambulanceWithout: at(ctx, "ambulanceBaseline_noSystem_kmh") as DataNode,
      compression: at(ctx, "scaling.timeCompression") as DataNode,
      trigger: at(ctx, "global.system.triggerDistance_m") as DataNode,
      cycle: Object.fromEntries(JUNCTIONS.map((j) => [j, deref(ctx, obj(ctx, `sim.signalPlan.${j}`).cycle_s)])) as Record<JunctionId, DataNode>,
      queuedBelow: at(ctx, "global.queue.queuedBelow_kmh") as DataNode,
      queuedBelowMs: num(ctx, "global.queue.queuedBelow_kmh") / 3.6,
      destination: (scenario.junctions?.destination ?? "hospital").split(",")[0],
      names: Object.fromEntries(JUNCTIONS.map((j) => [j, junctionName(scenario, j)])) as Record<JunctionId, string>,
    };
  }, [id]);
}

export type ScenarioView = ReturnType<typeof useScenario>;

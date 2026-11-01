// Web Worker: projects one scenario's OSM export and merges its buildings off the main thread,
// then hands the vertex arrays over without copying.
import data from "@data/scenarios.json";
import { buildConfig } from "../engine/config";
import { buildCorridor, osmFileFor } from "./corridor";
import { buildCity } from "./buildings";
import { packCity } from "./cityCache";

const osmFiles = import.meta.glob("/data/osm/*.geojson", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

self.onmessage = (e: MessageEvent<string>) => {
  const id = e.data;
  const corridor = buildCorridor(data, id, buildConfig(data, id), osmFiles[`/data/osm/${osmFileFor(data, id)}`]);
  const { packed, transfer } = packCity(buildCity(corridor.footprints));
  (self as unknown as Worker).postMessage({ id, city: packed }, transfer);
};

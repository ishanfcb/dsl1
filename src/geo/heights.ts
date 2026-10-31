// Building heights from OSM tags, with the fallback rules in scenarios.json (global.buildings).
import { next } from "../engine/rng";
import type { OsmBuilding } from "./osm";

export interface HeightRules {
  metresPerLevel: number;
  randomRange: [number, number];
  seed: number;
}

function tagNumber(v: string | number | undefined): number | null {
  if (v === undefined) return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildingHeight(b: OsmBuilding, rules: HeightRules): number {
  const h = tagNumber(b.tags.height);
  if (h !== null) return h;
  const levels = tagNumber(b.tags["building:levels"]);
  if (levels !== null) return levels * rules.metresPerLevel;
  const osmId = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
  const [u] = next((rules.seed + osmId) >>> 0);
  const [lo, hi] = rules.randomRange;
  return lo + u * (hi - lo);
}

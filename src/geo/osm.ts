// Reads an overpass-turbo GeoJSON export: building footprints, roads and raw ways by id.
import type { LonLat } from "./project";

type Tags = Record<string, string | number | undefined>;

export interface OsmBuilding {
  id: string;
  tags: Tags;
  /** Outer ring first, then holes. lon/lat. */
  rings: LonLat[][];
}

export interface OsmRoad {
  id: string;
  tags: Tags;
  pts: LonLat[];
}

export interface OsmData {
  buildings: OsmBuilding[];
  roads: OsmRoad[];
  way(id: string): OsmRoad;
}

interface Feature {
  id?: string;
  properties: Tags;
  geometry: { type: string; coordinates: unknown };
}

export function parseOsm(text: string): OsmData {
  const fc = JSON.parse(text) as { features: Feature[] };
  const buildings: OsmBuilding[] = [];
  const roads: OsmRoad[] = [];
  for (const f of fc.features) {
    const id = String(f.properties["@id"] ?? f.id);
    const g = f.geometry;
    if (f.properties.building !== undefined) {
      if (g.type === "Polygon") buildings.push({ id, tags: f.properties, rings: g.coordinates as LonLat[][] });
      else if (g.type === "MultiPolygon") {
        for (const poly of g.coordinates as LonLat[][][]) buildings.push({ id, tags: f.properties, rings: poly });
      }
    } else if (f.properties.highway !== undefined && g.type === "LineString") {
      roads.push({ id, tags: f.properties, pts: g.coordinates as LonLat[] });
    }
  }
  const byId = new Map(roads.map((r) => [r.id, r]));
  return {
    buildings,
    roads,
    way(id) {
      const r = byId.get(id);
      if (!r) throw new Error(`OSM export has no way "${id}"`);
      return r;
    },
  };
}

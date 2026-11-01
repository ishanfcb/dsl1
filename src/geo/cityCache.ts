// Merged building geometry per corridor, built once. A worker can build it ahead of time and hand over the
// raw vertex arrays (`pack` / `unpack`), so the page never stalls merging thousands of footprints.
import { BufferAttribute, BufferGeometry } from "three";
import { buildCity } from "./buildings";
import type { Corridor } from "./corridor";

export type City = ReturnType<typeof buildCity>;
export interface PackedGeometry {
  attributes: Record<string, { array: Float32Array; itemSize: number }>;
}
export interface PackedCity {
  solids: PackedGeometry;
  edges: PackedGeometry;
}

const cities = new WeakMap<Corridor, City>();

export function cityOf(corridor: Corridor): City {
  let c = cities.get(corridor);
  if (!c) {
    c = buildCity(corridor.footprints);
    cities.set(corridor, c);
  }
  return c;
}

/** Uses a city built elsewhere (a worker) for this corridor. */
export function adoptCity(corridor: Corridor, packed: PackedCity) {
  cities.set(corridor, { solids: unpack(packed.solids), edges: unpack(packed.edges) });
}

function pack(g: BufferGeometry): PackedGeometry {
  if (g.index) throw new Error("pack: indexed geometry is not supported");
  const attributes: PackedGeometry["attributes"] = {};
  for (const [name, a] of Object.entries(g.attributes)) {
    attributes[name] = { array: a.array as Float32Array, itemSize: a.itemSize };
  }
  return { attributes };
}

function unpack(p: PackedGeometry): BufferGeometry {
  const g = new BufferGeometry();
  for (const [name, a] of Object.entries(p.attributes)) g.setAttribute(name, new BufferAttribute(a.array, a.itemSize));
  g.computeBoundingSphere();
  return g;
}

export function packCity(city: City): { packed: PackedCity; transfer: ArrayBuffer[] } {
  const packed = { solids: pack(city.solids), edges: pack(city.edges) };
  const transfer = [packed.solids, packed.edges].flatMap((p) => Object.values(p.attributes).map((a) => a.array.buffer as ArrayBuffer));
  return { packed, transfer };
}

// lon/lat → local metres around a centre point (d3-geo). x = east, y = north.
import { geoAzimuthalEquidistant } from "d3-geo";

export type LonLat = [number, number];
export type XY = [number, number];

/** Mean Earth radius, so the azimuthal-equidistant scale is metres per radian. */
const EARTH_RADIUS_M = 6371008.8;

export interface Projection {
  (p: LonLat): XY;
  invert(p: XY): LonLat;
}

export function makeProjection(centre: LonLat): Projection {
  const proj = geoAzimuthalEquidistant().rotate([-centre[0], -centre[1]]).scale(EARTH_RADIUS_M).translate([0, 0]);
  const fwd = ((p: LonLat): XY => {
    const [x, y] = proj(p)!;
    return [x, -y]; // d3 screen y points down
  }) as Projection;
  fwd.invert = ([x, y]) => proj.invert!([x, -y]) as LonLat;
  return fwd;
}

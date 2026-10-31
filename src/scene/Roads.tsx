// OSM roads as thin grey lines on the ground. Arterials a shade lighter than side streets.
import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { MapRoad } from "../geo/corridor";
import { scene } from "../styles/tokens";
import { useSceneData } from "./SceneData";

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "secondary_link", "primary_link"]);
const ROAD_HEIGHT = 0.2;

function segments(roads: MapRoad[]): BufferGeometry {
  const pos: number[] = [];
  for (const r of roads) {
    for (let i = 1; i < r.pts.length; i++) {
      const [ax, ay] = r.pts[i - 1];
      const [bx, by] = r.pts[i];
      pos.push(ax, ROAD_HEIGHT, -ay, bx, ROAD_HEIGHT, -by);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  return g;
}

export function Roads() {
  const { corridor } = useSceneData();
  const [minor, major] = useMemo(() => {
    const isMajor = (r: MapRoad) => MAJOR.has(r.highway);
    return [segments(corridor.roads.filter((r) => !isMajor(r))), segments(corridor.roads.filter(isMajor))];
  }, [corridor]);
  useEffect(() => () => { minor.dispose(); major.dispose(); }, [minor, major]);

  return (
    <group>
      <lineSegments geometry={minor}>
        <lineBasicMaterial color={scene.road} />
      </lineSegments>
      <lineSegments geometry={major}>
        <lineBasicMaterial color={scene.roadMajor} />
      </lineSegments>
    </group>
  );
}

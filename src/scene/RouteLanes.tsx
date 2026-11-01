// The route road as its lanes: faint dashed lane lines, solid kerb lines, broken at the junction boxes.
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { JUNCTIONS } from "../engine";
import { scene } from "../styles/tokens";
import { useSceneData } from "./SceneData";

const HEIGHT = 0.3;
const DASH = 6;
const GAP = 9;
const STEP = 4;
export function RouteLanes() {
  const data = useSceneData();
  const { cfg, corridor } = data;
  const route = cfg.segments.route;
  const endX = route.endX;

  const lines = useMemo(() => {
    const boxes = JUNCTIONS.map((j) => [cfg.junctions[j].centreX - cfg.junctions[j].boxDepth / 2, cfg.junctions[j].centreX + cfg.junctions[j].boxDepth / 2]);
    const inBox = (x: number) => boxes.some(([a, b]) => x > a && x < b);
    const pos: number[] = [];
    const push = (x0: number, x1: number, lane: number) => {
      const a = corridor.pose("route", x0, lane).p;
      const b = corridor.pose("route", x1, lane).p;
      pos.push(a[0], HEIGHT, -a[1], b[0], HEIGHT, -b[1]);
    };
    for (let k = 0; k <= route.lanes; k++) {
      const lane = k - 0.5;
      const kerb = k === 0 || k === route.lanes;
      const on = kerb ? STEP : DASH;
      const period = kerb ? STEP : DASH + GAP;
      for (let x = 0; x + on <= endX; x += period) {
        if (!inBox(x) && !inBox(x + on)) push(x, x + on, lane);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    return g;
  }, [cfg, corridor, route, endX]);


  return (
    <lineSegments geometry={lines}>
      <lineBasicMaterial color={scene.laneLine} transparent opacity={0.7} />
    </lineSegments>
  );
}

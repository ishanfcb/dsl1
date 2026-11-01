// Road markings for the Junction close-up: lane lines on the other three approaches (the route's own lanes
// are RouteLanes) and a stop line on all four.
// They fade in as the camera comes down to this junction, so the Map overview stays as it was.
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from "three";
import { approachSegment, ROLES, type JunctionId, type SegmentId } from "../engine";
import { scene } from "../styles/tokens";
import { useSceneData } from "./SceneData";
import { useSceneView } from "./View";

const HEIGHT = 0.32;
/** Same dash pattern as RouteLanes. */
const DASH = 6;
const GAP = 9;
const STEP = 4;

export function JunctionMarkings({ junction }: { junction: JunctionId }) {
  const data = useSceneData();
  const view = useSceneView();
  const { cfg, corridor } = data;

  const { lanes, stops } = useMemo(() => {
    const reach = cfg.segments[`${junction}.left`].stops[0].x; // drawn cross-arm length
    const lanes: number[] = [];
    const stops: number[] = [];
    const line = (out: number[], segment: SegmentId, x0: number, l0: number, x1: number, l1: number) => {
      const a = corridor.pose(segment, x0, l0).p;
      const b = corridor.pose(segment, x1, l1).p;
      out.push(a[0], HEIGHT, -a[1], b[0], HEIGHT, -b[1]);
    };
    const dashed = (out: number[], segment: SegmentId, from: number, to: number, lane: number, on: number, period: number) => {
      for (let x = Math.ceil(from / period) * period; x + on <= to; x += period) line(out, segment, x, lane, x + on, lane);
    };

    for (const role of ROLES) {
      const segment = approachSegment(junction, role);
      const seg = cfg.segments[segment];
      const stop = seg.stops.find((s) => s.junction === junction)!.x;
      line(stops, segment, stop, -0.5, stop, seg.lanes - 0.5);
      if (role === "in") continue;
      // Inbound side up to the stop line, and the same lanes carried on past the box: the far side of that road.
      for (const [from, to] of [[Math.max(0, stop - reach), stop], [seg.endX, seg.endX + reach]]) {
        for (let k = 0; k <= seg.lanes; k++) {
          const kerb = k === 0 || k === seg.lanes;
          dashed(lanes, segment, from, to, k - 0.5, kerb ? STEP : DASH, kerb ? STEP : DASH + GAP);
        }
      }
    }

    const geometry = (pos: number[]) => {
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(pos, 3));
      return g;
    };
    return { lanes: geometry(lanes), stops: geometry(stops) };
  }, [cfg, corridor, junction]);
  useEffect(() => () => { lanes.dispose(); stops.dispose(); }, [lanes, stops]);

  const materials = useMemo(
    () => ({
      lanes: new LineBasicMaterial({ color: scene.laneLine, transparent: true, opacity: 0 }),
      stops: new LineBasicMaterial({ color: scene.marking, transparent: true, opacity: 0 }),
    }),
    [],
  );

  useFrame(() => {
    const c = view.closeness[junction];
    materials.lanes.opacity = 0.7 * c;
    materials.stops.opacity = 0.8 * c;
  });

  return (
    <group>
      <lineSegments geometry={lanes} material={materials.lanes} />
      <lineSegments geometry={stops} material={materials.stops} />
    </group>
  );
}

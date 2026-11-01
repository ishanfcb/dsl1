// The one camera. Map: tilted ~55° from vertical at a fixed three-quarter bearing, easing after the ambulance.
// Junction: lower and close over one junction, on the same bearing, so the city never spins.
// Changing position is a 2 s eased move from wherever the camera is; with reduced motion it cuts.
// The viewer can drag to turn and tilt the camera around its look point (useOrbitDrag); the turn is eased.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { JUNCTIONS, type JunctionId } from "../engine";
import { stateNow, useSceneData } from "./SceneData";
import { useSceneView } from "./View";
import { useOrbitDrag } from "./useOrbitDrag";
import { ambulanceOf } from "./vehiclePose";
import { toWorld } from "./world";

const MAP_TILT = (55 * Math.PI) / 180;
const MAP_DISTANCE = 860;
const JUNCTION_TILT = (60 * Math.PI) / 180;
const JUNCTION_DISTANCE = 160;
/** Swing the camera off the route axis so the route crosses the frame diagonally. */
const SIDE_ANGLE = (-32 * Math.PI) / 180;
/** How far ahead of the ambulance the camera looks (m). */
const LOOK_AHEAD_MIN = 120;
const LOOK_AHEAD_MAX = 230;
/** Exponential follow rate (1/s of wall time). */
const FOLLOW = 1.6;
/** Length of a move between Map and Junction (wall seconds). */
const FLY_S = 2;
/** Exponential rate at which the camera catches up with the viewer's drag (1/s). */
const ORBIT_EASE = 10;

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

interface Fly {
  focus: JunctionId | null;
  start: number;
  fromPos: Vector3;
  fromLook: Vector3;
  fromClose: Record<JunctionId, number>;
}

export function CameraRig() {
  const data = useSceneData();
  const view = useSceneView();
  const { camera } = useThree();
  const follow = useRef<Vector3 | null>(null);
  const fly = useRef<Fly | null>(null);
  const look = useMemo(() => new Vector3(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const targetPos = useMemo(() => new Vector3(), []);
  const targetLook = useMemo(() => new Vector3(), []);

  /** Direction from the look point back to the camera on the ground: behind the direction of travel, rotated sideways. */
  const bearing = useMemo(() => {
    const { J1, J2 } = data.corridor.junctionXY;
    return Math.atan2(J2[1] - J1[1], J2[0] - J1[0]) + Math.PI + SIDE_ANGLE;
  }, [data.corridor]);
  const orbit = useRef({ yaw: 0, tilt: 0 });
  const offset = useMemo(() => new Vector3(), []);
  /** Camera offset from the point it looks at, for a distance and tilt from vertical, on the eased bearing. */
  const at = (distance: number, tilt: number, out: Vector3) => {
    const a = bearing + orbit.current.yaw;
    const t = Math.min(Math.PI / 2 - 0.05, Math.max(0.1, tilt + orbit.current.tilt));
    const horizontal = distance * Math.sin(t);
    return out.set(Math.cos(a) * horizontal, distance * Math.cos(t), -Math.sin(a) * horizontal);
  };
  useOrbitDrag(view);

  // A new city: cut straight to it instead of easing across the old one.
  const corridorSeen = useRef(data.corridor);
  useFrame((_, delta) => {
    if (corridorSeen.current !== data.corridor) {
      corridorSeen.current = data.corridor;
      follow.current = null;
      fly.current = null;
    }
    const s = stateNow(data);
    const k = data.reducedMotion ? 1 : 1 - Math.exp(-delta * ORBIT_EASE);
    orbit.current.yaw += (view.orbit.yaw - orbit.current.yaw) * k;
    orbit.current.tilt += (view.orbit.tilt - orbit.current.tilt) * k;
    const { cfg, corridor } = data;

    // Map look point: halfway to the next junction (within limits), so the signal ahead stays in view.
    // Kept up to date while the camera is down at a junction, so Back returns to the present moment.
    const amb = ambulanceOf(s);
    const x = amb ? amb.x : s.ambulance.exitedAt !== null ? cfg.segments.route.endX : 0;
    const next = JUNCTIONS.map((j) => cfg.junctions[j].centreX).find((c) => c > x) ?? cfg.segments.route.endX;
    const ahead = Math.min(LOOK_AHEAD_MAX, Math.max(LOOK_AHEAD_MIN, (next - x) / 2));
    toWorld(corridor.pose("route", Math.min(x + ahead, cfg.segments.route.endX), cfg.ambulanceLane).p, 0, tmp);
    if (!follow.current || data.reducedMotion) follow.current = tmp.clone();
    else follow.current.lerp(tmp, 1 - Math.exp(-delta * FOLLOW));

    const focus = view.focus;
    if (focus) toWorld(corridor.junctionXY[focus], 0, targetLook);
    else targetLook.copy(follow.current);
    targetPos.copy(targetLook).add(focus ? at(JUNCTION_DISTANCE, JUNCTION_TILT, offset) : at(MAP_DISTANCE, MAP_TILT, offset));

    const now = performance.now();
    if (!fly.current || fly.current.focus !== focus) {
      const first = !fly.current;
      fly.current = {
        focus,
        // The first frame and reduced motion cut straight to the target.
        start: first || data.reducedMotion ? -Infinity : now,
        fromPos: camera.position.clone(),
        fromLook: look.clone(),
        fromClose: { ...view.closeness },
      };
    }
    const f = fly.current;
    const e = easeInOut(Math.min(1, (now - f.start) / (FLY_S * 1000)));
    camera.position.copy(f.fromPos).lerp(targetPos, e);
    look.copy(f.fromLook).lerp(targetLook, e);
    camera.lookAt(look);
    for (const j of JUNCTIONS) {
      const to = j === focus ? 1 : 0;
      view.closeness[j] = f.fromClose[j] + (to - f.fromClose[j]) * e;
    }
  });

  return null;
}

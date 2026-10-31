// The trigger radius (global.system.triggerDistance_m, S14) as a thin dashed blue circle on the ground.
// With the system on, it fades in while the ambulance is inside it and fades out once the ambulance has passed the junction.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute, type Mesh, type MeshBasicMaterial } from "three";
import type { JunctionId } from "../engine";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { ambulanceOf } from "./vehiclePose";
import { toWorld } from "./world";

const LINE_WIDTH = 2;
const DASH_M = 14;
const GAP_M = 10;
const OPACITY = 0.45;
/** Fade rate (1/s of wall time). */
const FADE = 3;

function dashedCircle(r: number): BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const dashes = Math.floor((2 * Math.PI * r) / (DASH_M + GAP_M));
  const step = (2 * Math.PI) / dashes;
  const dashAngle = step * (DASH_M / (DASH_M + GAP_M));
  const sub = 4;
  const r0 = r - LINE_WIDTH / 2;
  const r1 = r + LINE_WIDTH / 2;
  for (let d = 0; d < dashes; d++) {
    const base = pos.length / 3;
    for (let k = 0; k <= sub; k++) {
      const a = d * step + (dashAngle * k) / sub;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos.push(c * r0, 0, s * r0, c * r1, 0, s * r1);
      if (k > 0) {
        const i = base + (k - 1) * 2;
        index.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}

export function TriggerRing({ junction }: { junction: JunctionId }) {
  const data = useSceneData();
  const ref = useRef<Mesh>(null);
  const r = data.cfg.triggerDistance;
  const geometry = useMemo(() => dashedCircle(r), [r]);

  useFrame((_, delta) => {
    const s = stateNow(data);
    const amb = ambulanceOf(s);
    const passed = junction === "J1" ? s.ambulance.passedJ1At : s.ambulance.passedJ2At;
    const inside = data.sim.system && amb !== null && passed === null && data.cfg.junctions[junction].centreX - amb.x <= r;
    const m = ref.current!.material as MeshBasicMaterial;
    const target = inside ? OPACITY : 0;
    m.opacity = data.reducedMotion ? target : m.opacity + (target - m.opacity) * (1 - Math.exp(-delta * FADE));
    ref.current!.visible = m.opacity > 0.005;
  });

  return (
    <mesh ref={ref} geometry={geometry} position={toWorld(data.corridor.junctionXY[junction], 0.5)}>
      <meshBasicMaterial color={scene.blue} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

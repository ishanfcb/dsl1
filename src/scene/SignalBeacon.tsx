// The extra blue signal head at a junction, drawn on the ground: blinking with a soft pulse ring in ALERT,
// steady in PREWARN, a small dim grey dot otherwise. The dim dot shows "off" rather than implying it.
// In the Junction close-up the heads on each approach carry the blue light, so the centre lamp, halo and
// ground glow fade out there; the pulse ring stays.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, type Mesh, type MeshBasicMaterial, type Sprite, type SpriteMaterial } from "three";
import { blue, type JunctionId } from "../engine";
import { scene } from "../styles/tokens";
import { glowTexture } from "./glowTexture";
import { stateNow, useSceneData } from "./SceneData";
import { useSceneView } from "./View";
import { blinkOn, toWorld } from "./world";

/** Height of the lamp above the ground (m). The pin's leader starts just above it. */
export const BEACON_HEIGHT = 2.5;
const LIT_RADIUS = 3.2;
const OFF_RADIUS = 1.6;
/** Pulse ring: spreads to this radius (m) once a second in ALERT. Decoration; hidden with reduced motion. */
const PULSE_RADIUS = 70;
const PULSE_WIDTH = 2.5;
const GROUND_OPACITY = 0.25;

export function SignalBeacon({ junction }: { junction: JunctionId }) {
  const data = useSceneData();
  const view = useSceneView();
  const head = useRef<Mesh>(null);
  const halo = useRef<Sprite>(null);
  const ground = useRef<Mesh>(null);
  const pulse = useRef<Mesh>(null);
  const base = useMemo(() => toWorld(data.corridor.junctionXY[junction]), [data.corridor, junction]);
  const lit = useMemo(() => new Color(scene.blue).multiplyScalar(3), []);
  const off = useMemo(() => new Color(scene.beaconDim), []);

  useFrame(() => {
    const now = performance.now();
    const mode = blue(stateNow(data).controllers[junction]);
    const on = mode === "steady" || (mode === "blinking" && blinkOn(now));
    const away = 1 - view.closeness[junction];
    const h = head.current!;
    (h.material as MeshBasicMaterial).color.copy(on ? lit : off);
    h.scale.setScalar((mode === "off" ? OFF_RADIUS : LIT_RADIUS) * away);
    h.visible = away > 0.01;
    halo.current!.visible = on && h.visible;
    (halo.current!.material as SpriteMaterial).opacity = away;
    ground.current!.visible = on && h.visible;
    (ground.current!.material as MeshBasicMaterial).opacity = GROUND_OPACITY * away;

    const p = pulse.current!;
    p.visible = mode === "blinking" && !data.reducedMotion;
    if (p.visible) {
      const u = (now % 1000) / 1000;
      const r = PULSE_RADIUS * (0.15 + 0.85 * u);
      p.scale.set(r, r, 1);
      (p.material as MeshBasicMaterial).opacity = 0.5 * (1 - u) * (1 - u);
    }
  });

  return (
    <group position={base}>
      <mesh ref={head} position={[0, BEACON_HEIGHT, 0]}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshBasicMaterial color={off} toneMapped={false} />
      </mesh>
      <sprite ref={halo} position={[0, BEACON_HEIGHT, 0]} scale={[40, 40, 1]}>
        <spriteMaterial map={glowTexture()} color={lit} blending={AdditiveBlending} depthWrite={false} depthTest={false} transparent toneMapped={false} />
      </sprite>
      <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <circleGeometry args={[24, 48]} />
        <meshBasicMaterial color={scene.blue} transparent opacity={GROUND_OPACITY} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Unit ring scaled to the pulse radius. */}
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
        <ringGeometry args={[1 - PULSE_WIDTH / PULSE_RADIUS, 1, 96]} />
        <meshBasicMaterial color={scene.blue} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

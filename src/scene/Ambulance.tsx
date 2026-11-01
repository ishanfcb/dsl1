// The ambulance: a bright blue point with a soft halo, at its engine position.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, type Group } from "three";
import { scene } from "../styles/tokens";
import { glowTexture } from "./glowTexture";
import { stateNow, useSceneData } from "./SceneData";
import { ambulanceOf, vehiclePose } from "./vehiclePose";
import { toWorld } from "./world";

const HEIGHT = 3;

export function Ambulance() {
  const data = useSceneData();
  const ref = useRef<Group>(null);
  const core = useMemo(() => new Color(scene.blueCore).multiplyScalar(4), []);
  const halo = useMemo(() => new Color(scene.blue).multiplyScalar(2.5), []);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const s = stateNow(data);
    const amb = ambulanceOf(s);
    g.visible = amb !== null;
    if (amb) toWorld(vehiclePose(amb, data.corridor).p, HEIGHT, g.position);
  });

  return (
    <group ref={ref} renderOrder={4}>
      <mesh>
        <sphereGeometry args={[3.2, 20, 14]} />
        <meshBasicMaterial color={core} toneMapped={false} />
      </mesh>
      <sprite scale={[28, 28, 1]}>
        <spriteMaterial map={glowTexture()} color={halo} blending={AdditiveBlending} depthWrite={false} depthTest={false} transparent toneMapped={false} />
      </sprite>
    </group>
  );
}

// One signal head per approach, just left of the stop line (India keeps left): red / amber / green dots,
// then the extra blue light. Only lit lamps are coloured; the rest stay dark grey. The blue lamp blinks in
// ALERT and is steady in PREWARN, as the junction's beacon does. Lights come from the engine.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, SphereGeometry } from "three";
import { approachSegment, blue, lights, ROLES, type JunctionId, type Light, type Role } from "../engine";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { blinkOn, toWorld } from "./world";

const LAMP_RADIUS = 1.3;
/** Spacing between lamps along the approach (m). Exaggerated so the four read from the overview. */
const LAMP_SPACING = 3.4;
const LAMP_HEIGHT = 1.5;
/** Lane index of the head: just outside the leftmost lane. */
const KERB_LANE = -1.1;
const ORDER: (Light | "BLUE")[] = ["RED", "AMBER", "GREEN", "BLUE"];

export function SignalHeads({ junction }: { junction: JunctionId }) {
  const data = useSceneData();
  const { cfg, corridor } = data;
  const ref = useRef<InstancedMesh>(null);
  const lit = useMemo(
    () => ({
      RED: new Color(scene.signalRed),
      AMBER: new Color(scene.amber),
      GREEN: new Color(scene.signalGreen),
      BLUE: new Color(scene.blue).multiplyScalar(3),
    }),
    [],
  );
  const dark = useMemo(() => new Color(scene.beaconOff), []);
  const blueOff = useMemo(() => new Color(scene.beaconDim), []);
  const geometry = useMemo(() => new SphereGeometry(LAMP_RADIUS, 10, 8), []);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);

  // Lamp positions are fixed. RED sits nearest the junction.
  const placed = useMemo(() => {
    const dummy = new Object3D();
    const out: { role: Role; lamp: Light | "BLUE"; matrix: Matrix4 }[] = [];
    for (const role of ROLES) {
      const segment = approachSegment(junction, role);
      const stop = cfg.segments[segment].stops.find((s) => s.junction === junction)!;
      ORDER.forEach((lamp, i) => {
        toWorld(corridor.pose(segment, stop.x - i * LAMP_SPACING, KERB_LANE).p, LAMP_HEIGHT, dummy.position);
        dummy.updateMatrix();
        out.push({ role, lamp, matrix: dummy.matrix.clone() });
      });
    }
    return out;
  }, [cfg, corridor, junction]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const s = stateNow(data);
    const c = s.controllers[junction];
    const now = lights(cfg, cfg.junctions[junction], c, s.t);
    const mode = blue(c);
    const blueOn = mode === "steady" || (mode === "blinking" && blinkOn(performance.now()));
    placed.forEach((p, i) => {
      mesh.setMatrixAt(i, p.matrix);
      if (p.lamp === "BLUE") mesh.setColorAt(i, blueOn ? lit.BLUE : blueOff);
      else mesh.setColorAt(i, now[p.role] === p.lamp ? lit[p.lamp] : dark);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, placed.length]} frustumCulled={false} />;
}

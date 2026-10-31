// The ambulance's route ahead of it: a stream of blue-white dots over a faint blue band (city-3d.jpg).
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  MeshBasicMaterial,
} from "three";
import { offsetRight } from "../geo/polyline";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { useSceneView } from "./View";
import { ambulanceOf } from "./vehiclePose";
import { toWorld } from "./world";

const SPACING = 14;
const DOT_RADIUS = 1.6;
const DOT_HEIGHT = 2;
const BAND_WIDTH = 9;
const BAND_STEP = 4;
/** Dot size in the Junction close-up, as a share of the overview size, so lanes and queues stay readable. */
const CLOSE_SCALE = 0.3;
/** Dots drift forward at this many metres per screen second: decoration, not data. */
const DRIFT = 30;

const bandVertex = /* glsl */ `
  attribute float aX;
  varying float vX;
  varying float vAcross;
  attribute float aAcross;
  void main() {
    vX = aX;
    vAcross = aAcross;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const bandFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFrom;
  uniform float uTo;
  varying float vX;
  varying float vAcross;
  void main() {
    if (vX < uFrom) discard;
    float fadeIn = smoothstep(uFrom, uFrom + 40.0, vX);
    float fadeOut = 1.0 - smoothstep(uTo - 80.0, uTo, vX);
    float a = (1.0 - abs(vAcross)) * fadeIn * fadeOut * 0.55;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export function RouteStream() {
  const data = useSceneData();
  const view = useSceneView();
  const { cfg, corridor } = data;
  const endX = cfg.segments.route.endX;
  const maxDots = Math.ceil(endX / SPACING) + 2;
  const dots = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const dotGeometry = useMemo(() => new SphereGeometry(DOT_RADIUS, 12, 8), []);
  const dotMaterial = useMemo(() => {
    const m = new MeshBasicMaterial({ color: new Color(scene.blueCore).multiplyScalar(2.2), toneMapped: false });
    return m;
  }, []);

  const band = useMemo(() => {
    const pos: number[] = [];
    const xs: number[] = [];
    const across: number[] = [];
    const index: number[] = [];
    let row = 0;
    for (let x = 0; x <= endX; x += BAND_STEP, row++) {
      const pose = corridor.pose("route", x, cfg.middleLane);
      for (const side of [-1, 1]) {
        const p = offsetRight(pose, (side * BAND_WIDTH) / 2);
        pos.push(p[0], 0.4, -p[1]);
        xs.push(x);
        across.push(side);
      }
      if (row > 0) {
        const a = (row - 1) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aX", new Float32BufferAttribute(xs, 1));
    g.setAttribute("aAcross", new Float32BufferAttribute(across, 1));
    g.setIndex(index);
    const m = new ShaderMaterial({
      vertexShader: bandVertex,
      fragmentShader: bandFragment,
      uniforms: { uColor: { value: new Color(scene.blue) }, uFrom: { value: 0 }, uTo: { value: endX } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return { g, m };
  }, [corridor, cfg, endX]);

  useFrame(() => {
    const mesh = dots.current;
    if (!mesh) return;
    const s = stateNow(data);
    const amb = ambulanceOf(s);
    const done = s.ambulance.exitedAt !== null;
    const from = amb ? amb.x : done ? endX : 0;
    band.m.uniforms.uFrom.value = from;

    const screenT = s.t / cfg.timeCompression;
    const phase = (screenT * DRIFT) % SPACING;
    const size = 1 - (1 - CLOSE_SCALE) * Math.max(view.closeness.J1, view.closeness.J2);
    let n = 0;
    for (let x = from + phase + SPACING * 0.5; x < endX - 20 && n < maxDots; x += SPACING) {
      const pose = corridor.pose("route", x, cfg.middleLane);
      toWorld(pose.p, DOT_HEIGHT, dummy.position);
      // Dots shrink in for the first stretch ahead of the ambulance so the stream grows out of it.
      const k = Math.min(1, (x - from) / 60);
      dummy.scale.setScalar((0.5 + 0.5 * k) * size);
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={band.g} material={band.m} renderOrder={1} frustumCulled={false} />
      <instancedMesh ref={dots} args={[dotGeometry, dotMaterial, maxDots]} frustumCulled={false} renderOrder={3} />
    </group>
  );
}

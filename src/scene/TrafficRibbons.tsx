// General traffic as amber light. Each engine sprite is one glowing capsule in its lane, as long as the
// sprite (so its length follows the vehicle type). Packed sprites at a red light touch end to end and
// glow brighter, so standing queues read as dense bright bands; free flow reads as separate dimmer capsules.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import type { Vehicle } from "../engine";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { vehiclePose } from "./vehiclePose";
import { headingY, toWorld } from "./world";

const MAX = 1500;
const HEIGHT = 0.6;
/** Capsule body width as a share of the lane, so lanes stay visibly separate. */
const BODY_SHARE = 0.6;
/** Glow strength range; above ~1 it passes the bloom threshold. */
const GLOW_FREE = 1.1;
const GLOW_JAM = 3;

const vertex = /* glsl */ `
  attribute float aGlow;
  attribute float aLength;
  varying vec2 vUv;
  varying float vGlow;
  varying float vLength;
  void main() {
    vUv = uv;
    vGlow = aGlow;
    vLength = aLength;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
// Quad = capsule plus a lane-width margin of halo; distances in metres.
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uWidth;
  uniform float uRadius;
  varying vec2 vUv;
  varying float vGlow;
  varying float vLength;
  void main() {
    float along = (vUv.x - 0.5) * (vLength + uWidth);
    float across = (vUv.y - 0.5) * uWidth;
    float halfLen = max(0.0, vLength * 0.5 - uRadius);
    float d = length(vec2(max(abs(along) - halfLen, 0.0), across)) - uRadius;
    float body = 1.0 - smoothstep(-0.35, 0.35, d);
    float halo = exp(-max(d, 0.0) / (uRadius * 0.9)) * 0.35;
    float a = max(body, halo);
    gl_FragColor = vec4(uColor * vGlow * a, a);
  }
`;

/** 0 = free flowing, 1 = bumper to bumper. From the gap to the sprite ahead in the same lane. */
function densityOf(v: Vehicle, leader: Vehicle | undefined): number {
  if (!leader) return 0;
  const gap = Math.max(0, leader.x - leader.length - v.x);
  const occupancy = v.length / (v.length + gap);
  return Math.min(1, Math.max(0, (occupancy - 0.2) / 0.5));
}

export function TrafficRibbons() {
  const data = useSceneData();
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const width = data.corridor.laneWidth;
  const { geometry, material, glow, len } = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2); // lie flat; local +x = along the lane
    const glow = new InstancedBufferAttribute(new Float32Array(MAX), 1);
    const len = new InstancedBufferAttribute(new Float32Array(MAX), 1);
    glow.setUsage(DynamicDrawUsage);
    len.setUsage(DynamicDrawUsage);
    geometry.setAttribute("aGlow", glow);
    geometry.setAttribute("aLength", len);
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uColor: { value: new Color(scene.amber) },
        uWidth: { value: width },
        uRadius: { value: (width * BODY_SHARE) / 2 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material, glow, len };
  }, [width]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const s = stateNow(data);
    // Leader in the same lane: sort each lane front to back.
    const lanes = new Map<string, Vehicle[]>();
    for (const v of s.vehicles) {
      if (v.type === "ambulance") continue;
      const k = `${v.segment}|${v.lane}`;
      const list = lanes.get(k);
      if (list) list.push(v);
      else lanes.set(k, [v]);
    }
    let n = 0;
    for (const list of lanes.values()) {
      list.sort((a, b) => b.x - a.x);
      for (let i = 0; i < list.length && n < MAX; i++) {
        const v = list[i];
        const d = densityOf(v, list[i - 1]);
        const pose = vehiclePose(v, data.cfg, data.corridor, s.t);
        toWorld(pose.p, HEIGHT, dummy.position);
        dummy.rotation.set(0, headingY(pose.dir), 0);
        dummy.scale.set(v.length + width, 1, width);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        glow.setX(n, GLOW_FREE + (GLOW_JAM - GLOW_FREE) * d);
        len.setX(n, v.length);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    glow.needsUpdate = true;
    len.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, MAX]} frustumCulled={false} renderOrder={2} />;
}

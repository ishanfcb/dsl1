// General traffic as amber light, one small glowing capsule per vehicle. An engine sprite stands for
// cfg.vehiclesPerSprite vehicles packed into a short platoon (scaling.spritePlatoon.packing: mixed traffic
// filling gaps sideways), so its vehicles are drawn a few abreast across the lane in rows along the platoon.
// Where they sit inside the platoon is decoration (seeded by vehicle id, so it is the same every frame);
// the platoon's position and length are the engine's. Packed sprites glow brighter, so standing queues read
// as dense bright clusters and free flow as scattered dimmer dots.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
import type { Corridor } from "../geo/corridor";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { headingY, toWorld } from "./world";

const MAX = 16000;
const HEIGHT = 0.6;
/** Vehicles side by side across one lane inside a platoon. */
const ABREAST = 3;
/** Each vehicle's capsule length as a share of its slot in the platoon, leaving a gap to the next row. */
const LENGTH_SHARE = 0.7;
/** Capsule body width as a share of its slot across the lane, so neighbours stay visibly separate. */
const BODY_SHARE = 0.55;
/** Random nudge of each vehicle inside its slot (share of the slot), so platoons don't read as grids. */
const JITTER = 0.18;
/** Camera height (m) up to which vehicles are drawn at true size. Higher up (the Map overview) they grow with
 *  the height, so each one stays a visible dot on screen instead of shrinking below a pixel. */
const TRUE_SIZE_BELOW = 160;
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

/** Deterministic 0..1 from a vehicle id and a slot index. */
function hash(id: number, i: number): number {
  const x = Math.sin(id * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

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
  const { camera } = useThree();
  const dummy = useMemo(() => new Object3D(), []);
  const slotW = data.corridor.laneWidth / ABREAST;
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
        uWidth: { value: slotW },
        uRadius: { value: (slotW * BODY_SHARE) / 2 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material, glow, len };
  }, [slotW]);

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
    const grow = Math.max(1, camera.position.y / TRUE_SIZE_BELOW);
    const w = slotW * grow;
    material.uniforms.uWidth.value = w;
    material.uniforms.uRadius.value = (w * BODY_SHARE) / 2;
    const perSprite = data.cfg.vehiclesPerSprite;
    const rows = Math.ceil(perSprite / ABREAST);
    let n = 0;
    const put = (c: Corridor, v: Vehicle, x: number, lane: number, length: number, g: number) => {
      const pose = c.pose(v.segment, x, lane);
      toWorld(pose.p, HEIGHT, dummy.position);
      dummy.rotation.set(0, headingY(pose.dir), 0);
      dummy.scale.set(length + w, 1, w);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      glow.setX(n, g);
      len.setX(n, length);
      n++;
    };
    for (const list of lanes.values()) {
      list.sort((a, b) => b.x - a.x);
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        const g = GLOW_FREE + (GLOW_JAM - GLOW_FREE) * densityOf(v, list[i - 1]);
        const slot = v.length / rows;
        for (let k = 0; k < perSprite && n < MAX; k++) {
          const row = Math.floor(k / ABREAST);
          const inRow = Math.min(ABREAST, perSprite - row * ABREAST);
          const col = (k % ABREAST) - (inRow - 1) / 2;
          const x = v.x - slot * (row + 0.5 + (hash(v.id, k) - 0.5) * JITTER);
          const lane = v.lane + (col + (hash(v.id, k + 97) - 0.5) * JITTER) / ABREAST;
          put(data.corridor, v, x, lane, Math.max(slot * LENGTH_SHARE, w * BODY_SHARE), g);
        }
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    glow.needsUpdate = true;
    len.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, MAX]} frustumCulled={false} renderOrder={2} />;
}

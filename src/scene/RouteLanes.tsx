// The route road as its lanes: faint dashed lane lines, solid kerb lines, broken at the junction boxes.
// With the system on, the middle lane ahead of the ambulance is edged in faint blue up to the first
// vehicle still in it, so the cleared lane reads as a dark channel.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial } from "three";
import { JUNCTIONS } from "../engine";
import { scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { ambulanceOf, drawnLane } from "./vehiclePose";
import { toWorld } from "./world";

const HEIGHT = 0.3;
const DASH = 6;
const GAP = 9;
const STEP = 4;
/** A vehicle this close to the middle lane's centre (in lanes) still blocks it. */
const BLOCKS = 0.75;

const edgeVertex = /* glsl */ `
  attribute float aX;
  varying float vX;
  void main() {
    vX = aX;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const edgeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFrom;
  uniform float uTo;
  varying float vX;
  void main() {
    if (vX < uFrom || vX > uTo) discard;
    float a = smoothstep(uFrom, uFrom + 20.0, vX) * (1.0 - smoothstep(uTo - 20.0, uTo, vX)) * 0.7;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

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

  const edges = useMemo(() => {
    const pos: number[] = [];
    const xs: number[] = [];
    for (const side of [-0.5, 0.5]) {
      for (let x = 0; x + STEP <= endX; x += STEP) {
        for (const xx of [x, x + STEP]) {
          toWorld(corridor.pose("route", xx, cfg.middleLane + side).p, HEIGHT + 0.05).toArray(pos, pos.length);
          xs.push(xx);
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aX", new Float32BufferAttribute(xs, 1));
    const m = new ShaderMaterial({
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
      uniforms: { uColor: { value: new Color(scene.blue) }, uFrom: { value: 0 }, uTo: { value: 0 } },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    return { g, m };
  }, [cfg, corridor, endX]);

  useFrame(() => {
    const s = stateNow(data);
    const amb = ambulanceOf(s);
    let to = 0;
    if (amb && data.sim.system) {
      to = endX;
      for (const v of s.vehicles) {
        if (v.segment !== "route" || v === amb || v.x - v.length <= amb.x) continue;
        if (Math.abs(drawnLane(v, cfg, s.t) - cfg.middleLane) < BLOCKS) to = Math.min(to, v.x - v.length);
      }
    }
    edges.m.uniforms.uFrom.value = amb ? amb.x : 0;
    edges.m.uniforms.uTo.value = to;
  });

  return (
    <group>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={scene.laneLine} transparent opacity={0.7} />
      </lineSegments>
      <lineSegments geometry={edges.g} material={edges.m} frustumCulled={false} renderOrder={1} />
    </group>
  );
}

// A red dimension line beside the route from the ambulance to the next junction it has not passed, with end ticks,
// and its length ("431 M") lying flat on the ground in the middle of the line, in the same perspective as the road.
// The line breaks around the number. Length = the engine's distance to the junction centre, the same distance
// the trigger uses. Line and text are flat strips on the ground, rebuilt every frame; the text is a canvas texture.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, type Group, type Mesh, SRGBColorSpace, Vector3 } from "three";
import type { JunctionId } from "../engine";
import { fonts, scene } from "../styles/tokens";
import { stateNow, useSceneData } from "./SceneData";
import { ambulanceOf } from "./vehiclePose";
import { headingY, toWorld } from "./world";

const HEIGHT = 0.4;
const STEP = 4;
/** On the kerb side of the route (left of travel), this many lanes out from the outer lane's centre. */
const OFFSET_LANES = 4;
// Sizes on the ground as a share of the camera's distance to the middle of the line, so the line and the
// number keep about the same size on screen in the Map overview and the Junction close-up.
/** Width of the line. */
const LINE_W = 0.0028;
/** End ticks, from side to side. */
const TICK_W = 0.016;
/** Height of the number (it is foreshortened by the camera's tilt). */
const TEXT_H = 0.022;
/** Clear ground either side of the number before the line resumes. */
const TEXT_PAD = 0.006;
const MAX_QUADS = 1200;

// Fixed canvas size: a texture keeps the size it was first uploaded at, so a resized canvas would leave old pixels.
const CANVAS_W = 640;
const CANVAS_H = 160;
const FONT_PX = 120;

export function DistanceLine() {
  const data = useSceneData();
  const { camera } = useThree();
  const strip = useRef<Mesh>(null);
  const label = useRef<Group>(null);
  const last = useRef({ text: "", aspect: 1 });
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(MAX_QUADS * 18), 3));
    return g;
  }, []);
  const text = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, []);
  useEffect(() => () => { geometry.dispose(); text.texture.dispose(); }, [geometry, text]);
  // Below the bloom threshold, like the other white text in the scene.
  const red = useMemo(() => new Color(scene.distance), []);
  const a = useMemo(() => new Vector3(), []);
  const b = useMemo(() => new Vector3(), []);

  /** Draws the number centred on the canvas; returns its inked width as a share of the canvas height. */
  const draw = (value: string) => {
    const ctx = text.canvas.getContext("2d")!;
    ctx.font = `400 ${FONT_PX}px ${fonts.sans}`;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, CANVAS_W / 2, CANVAS_H / 2 + FONT_PX * 0.05);
    text.texture.needsUpdate = true;
    return Math.min(CANVAS_W, ctx.measureText(value).width + 24) / CANVAS_H;
  };

  useFrame(() => {
    const { cfg, corridor } = data;
    const s = stateNow(data);
    const amb = ambulanceOf(s);
    const target: JunctionId | null = s.ambulance.passedJ1At === null ? "J1" : s.ambulance.passedJ2At === null ? "J2" : null;
    const mesh = strip.current!;
    const group = label.current!;
    if (!amb || !target) {
      mesh.visible = false;
      group.visible = false;
      return;
    }
    const x0 = amb.x;
    const x1 = cfg.junctions[target].centreX;
    const lane = -OFFSET_LANES;
    const mid = (x0 + x1) / 2;
    const pose = corridor.pose("route", mid, lane);
    const scale = camera.position.distanceTo(toWorld(pose.p, HEIGHT, a));

    const value = `${Math.max(0, Math.round(x1 - x0))} M`;
    if (value !== last.current.text) last.current = { text: value, aspect: draw(value) };
    const textH = TEXT_H * scale;
    const textW = textH * last.current.aspect; // inked width, for the gap in the line
    // The number only fits on the line while the line is longer than it; nearer the junction it goes.
    const fits = x1 - x0 > textW + 4 * TEXT_PAD * scale;
    const gap = fits ? textW / 2 + TEXT_PAD * scale : 0;

    // Line: flat quads along the route, broken around the number, plus a tick at each end.
    const pos = geometry.getAttribute("position") as Float32BufferAttribute;
    const half = (LINE_W * scale) / 2 / corridor.laneWidth;
    const tick = (TICK_W * scale) / 2 / corridor.laneWidth;
    let n = 0;
    const quad = (xa: number, xb: number, la: number, lb: number) => {
      if (n >= MAX_QUADS * 6) return;
      const p = (x: number, l: number) => corridor.pose("route", x, l).p;
      const [q0, q1, q2, q3] = [p(xa, la), p(xb, la), p(xb, lb), p(xa, lb)];
      for (const q of [q0, q1, q2, q0, q2, q3]) pos.setXYZ(n++, q[0], HEIGHT, -q[1]);
    };
    for (let x = x0; x < x1; x += STEP) {
      const xb = Math.min(x + STEP, x1);
      if (x < mid - gap) quad(x, Math.min(xb, mid - gap), lane - half, lane + half);
      if (xb > mid + gap) quad(Math.max(x, mid + gap), xb, lane - half, lane + half);
    }
    const tickLen = LINE_W * scale;
    quad(x0, x0 + tickLen, lane - tick, lane + tick);
    quad(x1 - tickLen, x1, lane - tick, lane + tick);
    pos.needsUpdate = true;
    geometry.setDrawRange(0, n);
    geometry.computeBoundingSphere();
    mesh.visible = true;

    // Number: flat on the ground at the middle of the line, along the road, turned so it reads left to right.
    group.visible = fits;
    if (!fits) return;
    toWorld(pose.p, HEIGHT + 0.05, group.position);
    a.copy(group.position).project(camera);
    toWorld([pose.p[0] + pose.dir[0] * 10, pose.p[1] + pose.dir[1] * 10], HEIGHT, b).project(camera);
    group.rotation.y = headingY(pose.dir) + (b.x < a.x ? Math.PI : 0);
    group.scale.set((textH * CANVAS_W) / CANVAS_H, 1, textH); // the plane lies flat: its height runs along the group's z
  });

  return (
    <group>
      <mesh ref={strip} geometry={geometry} frustumCulled={false} renderOrder={1}>
        <meshBasicMaterial color={red} transparent opacity={0.9} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={label}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={text.texture} color="#D9D9D9" transparent depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

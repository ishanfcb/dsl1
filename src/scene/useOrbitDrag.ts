// Drag on the canvas to look around: left/right turns the camera around the point it looks at,
// up/down tilts it. Double-click returns to the set view. The wheel stays the timeline scrubber.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { SceneView } from "./View";

/** Radians per pixel dragged. */
const YAW_PER_PX = 0.005;
const TILT_PER_PX = 0.004;
/** Tilt change allowed from the set tilt (rad): up to 20° more top-down, 15° flatter. Map stays 35–70° from vertical. */
const TILT_MIN = (-20 * Math.PI) / 180;
const TILT_MAX = (15 * Math.PI) / 180;

export function useOrbitDrag(view: SceneView) {
  const el = useThree((s) => s.gl.domElement);
  useEffect(() => {
    let last: { x: number; y: number } | null = null;
    el.style.cursor = "grab";
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      const o = view.orbit;
      o.yaw -= (e.clientX - last.x) * YAW_PER_PX;
      o.tilt = Math.max(TILT_MIN, Math.min(TILT_MAX, o.tilt - (e.clientY - last.y) * TILT_PER_PX));
      last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      last = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };
    const reset = () => {
      view.orbit.yaw = 0;
      view.orbit.tilt = 0;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", reset);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("dblclick", reset);
    };
  }, [el, view]);
}

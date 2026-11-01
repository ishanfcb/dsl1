// Which camera position the scene is in, shared by the camera and the pieces that fade with it.
// One mutable object per scene: the page sets `focus`, the camera writes `closeness` every frame.
import { createContext, useContext } from "react";
import type { JunctionId } from "../engine";

export interface SceneView {
  /** Junction the camera is down at, or null for the Map overview. */
  focus: JunctionId | null;
  /** 0 = Map overview, 1 = close on that junction. Eased with the camera move. */
  closeness: Record<JunctionId, number>;
  /** Viewer's drag: turn around the look point and change of tilt (rad), added to the camera's set bearing. */
  orbit: { yaw: number; tilt: number };
}

export function createView(): SceneView {
  return { focus: null, closeness: { J1: 0, J2: 0 }, orbit: { yaw: 0, tilt: 0 } };
}

export const SceneViewContext = createContext<SceneView | null>(null);

export function useSceneView(): SceneView {
  const v = useContext(SceneViewContext);
  if (!v) throw new Error("Scene component outside SceneViewContext");
  return v;
}

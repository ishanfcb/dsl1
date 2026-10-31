// What every scene component reads: the engine run, its config, the map placement and the current time.
import { createContext, useContext } from "react";
import type { MotionValue } from "motion/react";
import type { SimConfig, Simulation } from "../engine";
import type { Corridor } from "../geo/corridor";

export interface SceneData {
  sim: Simulation;
  cfg: SimConfig;
  corridor: Corridor;
  /** Engine (real) seconds. Scene components read it every frame; they never simulate. */
  time: MotionValue<number>;
  reducedMotion: boolean;
}

export const SceneDataContext = createContext<SceneData | null>(null);

export function useSceneData(): SceneData {
  const d = useContext(SceneDataContext);
  if (!d) throw new Error("Scene component outside SceneDataContext");
  return d;
}

/** Engine state at the current time. Cheap to call several times a frame (the engine caches its cursor). */
export function stateNow(d: SceneData) {
  return d.sim.at(d.time.get());
}

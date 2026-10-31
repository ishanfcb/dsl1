// Public engine API. Pure TypeScript: no React, no DOM.
export { buildConfig, floodSpeedKmh, scenarioIds } from "./config";
export { Simulation, compare, type RunResult } from "./simulation";
export { blue, lights } from "./signals";
export { approachSegment, junctionQueues, type ArmQueue } from "./queues";
export * from "./types";

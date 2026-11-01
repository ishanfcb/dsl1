// Web Worker: runs one engine run (with or without the system) off the main thread and posts back its record.
// Same buildConfig and seed as the page, so a rebuilt run is identical to one computed in place.
import data from "@data/scenarios.json";
import { buildConfig } from "./config";
import { Simulation } from "./simulation";

self.onmessage = (e: MessageEvent<{ id: string; system: boolean }>) => {
  const { id, system } = e.data;
  const record = new Simulation(buildConfig(data, id), { system }).record();
  self.postMessage({ id, system, record });
};

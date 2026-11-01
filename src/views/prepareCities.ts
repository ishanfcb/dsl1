// Everything slow about a city, done once. Cities other than the first are prepared in Web Workers as soon as
// the app loads: each engine run (with and without the system) and the merged buildings in a worker of its
// own, in parallel. Switching city then only rebuilds finished results instead of freezing the page.
import { useSyncExternalStore } from "react";
import { compare, type RunRecord, type SimConfig } from "../engine";
import type { PackedCity } from "../geo/cityCache";

interface Prepared {
  without?: RunRecord;
  withSystem?: RunRecord;
  city?: PackedCity;
}
const prepared = new Map<string, Prepared>();
const runs = new Map<string, ReturnType<typeof compare>>();
const listeners = new Set<() => void>();

const done = (p: Prepared | undefined): p is Required<Prepared> => !!p?.without && !!p?.withSystem && !!p?.city;

/** `create` must write `new Worker(new URL(...))` inline, or Vite will not bundle the worker for production. */
function work<T>(create: () => Worker, message: unknown, onDone: (data: T) => void) {
  const worker = create();
  worker.onmessage = (e: MessageEvent<T>) => {
    worker.terminate();
    onDone(e.data);
  };
  worker.postMessage(message);
}

/** Starts preparing these scenarios in the background. Safe to call more than once. */
export function prefetchCities(ids: string[]) {
  for (const id of ids) {
    if (prepared.has(id) || runs.has(id)) continue;
    const p: Prepared = {};
    prepared.set(id, p);
    const settle = () => {
      if (done(p)) listeners.forEach((l) => l());
    };
    for (const system of [false, true]) {
      const runWorker = () => new Worker(new URL("../engine/runWorker.ts", import.meta.url), { type: "module" });
      work<{ record: RunRecord }>(runWorker, { id, system }, ({ record }) => {
        p[system ? "withSystem" : "without"] = record;
        settle();
      });
    }
    const cityWorker = () => new Worker(new URL("../geo/cityWorker.ts", import.meta.url), { type: "module" });
    work<{ city: PackedCity }>(cityWorker, id, ({ city }) => {
      p.city = city;
      settle();
    });
  }
}

/** Both runs for a scenario: from the cache, rebuilt from the workers' records, or (first city) computed here. */
export function getRuns(id: string, cfg: SimConfig) {
  let r = runs.get(id);
  if (!r) {
    const p = prepared.get(id);
    r = compare(cfg, undefined, done(p) ? p : undefined);
    runs.set(id, r);
  }
  return r;
}

/** Buildings a worker merged for this scenario, if any. */
export function preparedCity(id: string): PackedCity | undefined {
  return prepared.get(id)?.city;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** True once a city can be shown without heavy work on the main thread. */
export function useCityReady(id: string): boolean {
  return useSyncExternalStore(subscribe, () => runs.has(id) || done(prepared.get(id)));
}

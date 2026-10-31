// Seeded randomness. State is a single uint32 so it can live inside SimState and be cloned.

/** mulberry32: returns [value in [0,1), next state]. */
export function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Stable seed for a named stream, so each arm's arrivals don't depend on the others. */
export function streamSeed(seed: number, name: string): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/** Draws from a stream held in an object field. */
export class Stream {
  constructor(private holder: { rng: number }) {}

  uniform(): number {
    const [u, s] = next(this.holder.rng);
    this.holder.rng = s;
    return u;
  }

  exponential(rate: number): number {
    return -Math.log(1 - this.uniform()) / rate;
  }

  /** Box–Muller, one value per call. */
  normal(mean: number, sd: number): number {
    const u1 = Math.max(this.uniform(), 1e-12);
    const u2 = this.uniform();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  pick<T extends string>(weights: Record<T, number>): T {
    const keys = Object.keys(weights) as T[];
    const total = keys.reduce((sum, k) => sum + weights[k], 0);
    let r = this.uniform() * total;
    for (const k of keys) {
      r -= weights[k];
      if (r < 0) return k;
    }
    return keys[keys.length - 1];
  }
}

// Intelligent Driver Model (S16: Treiber, Hennecke & Helbing 2000).

export interface IdmParams {
  a: number;
  b: number;
  delta: number;
  s0: number;
  T: number;
}

/** Hard floor on deceleration so a vehicle suddenly facing a tiny gap doesn't produce NaN-scale values. */
const MAX_DECEL = 9;

/**
 * @param v    own speed
 * @param v0   desired speed
 * @param gap  bumper-to-bumper gap to the obstacle ahead (Infinity if none)
 * @param dv   approach rate: own speed minus leader speed
 */
export function idmAcceleration(v: number, v0: number, gap: number, dv: number, p: IdmParams): number {
  const free = v0 > 0 ? 1 - Math.pow(v / v0, p.delta) : -1;
  if (!Number.isFinite(gap)) return Math.max(-MAX_DECEL, p.a * free);
  const sStar = p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  const s = Math.max(gap, 0.01);
  return Math.max(-MAX_DECEL, p.a * (free - (sStar / s) ** 2));
}

/** Ballistic update that never reverses: returns [new speed, distance moved]. */
export function integrate(v: number, acc: number, dt: number): [number, number] {
  const vNext = v + acc * dt;
  if (vNext < 0) return [0, acc < 0 ? (-v * v) / (2 * acc) : 0];
  return [vNext, v * dt + 0.5 * acc * dt * dt];
}

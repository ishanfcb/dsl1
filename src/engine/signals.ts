// Signal controllers: the fixed cycle, the PREWARN / ALERT override and the CLEARED hand-back.

import { ROLES, type BlueLight, type ControllerState, type JunctionConfig, type JunctionState, type Light, type Role, type SimConfig } from "./types";

export function initialController(j: JunctionConfig): ControllerState {
  return {
    state: "NORMAL",
    cycleClock: (((-j.offset) % j.cycle) + j.cycle) % j.cycle,
    since: 0,
    activeAtAlert: [],
    blueOnSince: null,
  };
}

/** Light from the fixed plan at a cycle position. */
export function planLight(j: JunctionConfig, role: Role, clock: number, amber: number): Light {
  const [start, end] = j.arms[role].green;
  if (clock >= start && clock < end) return "GREEN";
  if (clock >= end && clock < end + amber) return "AMBER";
  return "RED";
}

export function light(cfg: SimConfig, j: JunctionConfig, c: ControllerState, role: Role, t: number): Light {
  const { amber, allRed } = cfg.signal;
  switch (c.state) {
    case "NORMAL":
      return planLight(j, role, c.cycleClock, amber);
    // PREWARN and ALERT drive the same lights (n+1: the next junction clears its queue early); only the blue light differs.
    // The intergreen counts from when the override began, so PREWARN -> ALERT does not restart it.
    case "PREWARN":
    case "ALERT": {
      const tau = t - (c.blueOnSince ?? c.since);
      const inWasGreen = c.activeAtAlert.includes("in") && planLight(j, "in", c.cycleClock, amber) === "GREEN";
      if (role === "in") {
        if (inWasGreen) return "GREEN";
        const othersActive = c.activeAtAlert.some((r) => r !== "in");
        return tau >= (othersActive ? amber + allRed : allRed) ? "GREEN" : "RED";
      }
      return c.activeAtAlert.includes(role) && tau < amber ? "AMBER" : "RED";
    }
    case "CLEARED":
      return role === "in" && t - c.since < amber ? "AMBER" : "RED";
  }
}

export function lights(cfg: SimConfig, j: JunctionConfig, c: ControllerState, t: number): Record<Role, Light> {
  const out = {} as Record<Role, Light>;
  for (const r of ROLES) out[r] = light(cfg, j, c, r, t);
  return out;
}

export function blue(c: ControllerState): BlueLight {
  if (c.state === "ALERT") return "blinking";
  if (c.state === "PREWARN") return "steady";
  return "off";
}

/** Moves a controller to a new state. The cycle clock freezes from PREWARN or ALERT until NORMAL, so the interrupted phase gets its remaining green back. */
export function transition(cfg: SimConfig, j: JunctionConfig, c: ControllerState, to: JunctionState, t: number): void {
  const overriding = c.state === "PREWARN" || c.state === "ALERT";
  if ((to === "PREWARN" || to === "ALERT") && !overriding) {
    c.activeAtAlert = ROLES.filter((r) => planLight(j, r, c.cycleClock, cfg.signal.amber) !== "RED");
  }
  if (to === "NORMAL") c.activeAtAlert = [];
  c.blueOnSince = to === "ALERT" || to === "PREWARN" ? (c.blueOnSince ?? t) : null;
  c.state = to;
  c.since = t;
}

export function advanceClock(j: JunctionConfig, c: ControllerState, dt: number): void {
  if (c.state === "NORMAL") c.cycleClock = (c.cycleClock + dt) % j.cycle;
}

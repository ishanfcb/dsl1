import { describe, expect, test } from "vitest";
import data from "../../data/scenarios.json";
import { buildConfig, floodSpeedKmh, lights, blue, scenarioIds, Simulation, VEHICLE_TYPES } from "./index";
import type { SimConfig, SimState } from "./types";

const cfgs = Object.fromEntries(scenarioIds(data).map((id) => [id, buildConfig(data, id)])) as Record<string, SimConfig>;
const ctx = { root: data as unknown as Record<string, unknown>, scenario: {} };

// Shared runs (each takes ~0.1–1.5 s).
const rainWith = new Simulation(cfgs["bengaluru-heavy-rain"], { system: true });
const rainWithout = new Simulation(cfgs["bengaluru-heavy-rain"], { system: false });
const gurWith = new Simulation(cfgs["gurugram-monday-peak"], { system: true });

const snapshot = (s: Readonly<SimState>) => JSON.stringify(s);

describe("config from scenarios.json", () => {
  test("S9 flood speed matches its table", () => {
    expect(floodSpeedKmh(ctx, 150)).toBeCloseTo(24.3, 1);
    expect(floodSpeedKmh(ctx, 250)).toBeCloseTo(5.0, 1);
    expect(floodSpeedKmh(ctx, 300)).toBe(0);
  });

  test("speed ratios are true: rain traffic is 29 / 4.8 times slower than baseline", () => {
    const ratio = cfgs.baseline.trafficSpeed / cfgs["bengaluru-heavy-rain"].trafficSpeed;
    expect(ratio).toBeCloseTo(29 / 4.8, 9);
  });

  test("signal plans fit their cycles with a full intergreen after every green", () => {
    for (const cfg of Object.values(cfgs)) {
      for (const j of Object.values(cfg.junctions)) {
        for (const arm of Object.values(j.arms)) {
          expect(arm.green[1] + cfg.signal.amber + cfg.signal.allRed).toBeLessThanOrEqual(j.cycle);
        }
      }
    }
    const sb = cfgs["bengaluru-heavy-rain"].junctions.J1;
    expect(sb.cycle).toBe(285);
    expect(sb.arms.left.green[1] - sb.arms.left.green[0]).toBe(150); // BTM (S5)
    expect(sb.arms.right.green[1] - sb.arms.right.green[0]).toBe(90); // HSR (S5)
  });

  test("vehicle mixes sum to 1", () => {
    for (const cfg of Object.values(cfgs)) {
      expect(VEHICLE_TYPES.reduce((s, t) => s + cfg.types[t].share, 0)).toBeCloseTo(1, 9);
    }
  });

  test("baseline uses 25% of the S5 counts", () => {
    expect(cfgs.baseline.junctions.J1.arms.left.volumeVehPerHr).toBeCloseTo(8300 * 0.25, 6);
  });
});

describe("determinism", () => {
  test("same seed, same run", () => {
    const again = new Simulation(cfgs["gurugram-monday-peak"], { system: true });
    expect(again.result).toEqual(gurWith.result);
    expect(snapshot(again.at(400))).toBe(snapshot(gurWith.at(400)));
  });

  test("scrubbing backwards gives the same state as playing forwards", () => {
    const sim = new Simulation(cfgs["gurugram-monday-peak"], { system: false });
    const forward = snapshot(sim.at(333.3));
    sim.at(700);
    expect(snapshot(sim.at(333.3))).toBe(forward);
  });

  test("with and without system see identical traffic until the ambulance arrives", () => {
    const t = cfgs["bengaluru-heavy-rain"].warmUp - 1;
    expect(snapshot(rainWith.at(t))).toBe(snapshot(rainWithout.at(t)));
  });
});

describe("junction state machine (n+1)", () => {
  test("states run in the order of CLAUDE.md §1", () => {
    for (const sim of [rainWith, gurWith]) {
      expect(sim.log.events.map((e) => `${e.junction}:${e.to}`)).toEqual([
        "J1:ALERT",
        "J2:PREWARN",
        "J1:CLEARED",
        "J2:ALERT",
        "J1:NORMAL",
        "J2:CLEARED",
        "J2:NORMAL",
      ]);
    }
  });

  test("J1 alerts once the ambulance is within the trigger distance", () => {
    const cfg = rainWith.cfg;
    const alert = rainWith.log.events.find((e) => e.to === "ALERT")!;
    const s = rainWith.at(alert.t);
    const amb = s.vehicles.find((v) => v.id === s.ambulanceId)!;
    const dist = cfg.junctions.J1.centreX - amb.x;
    expect(dist).toBeLessThanOrEqual(cfg.triggerDistance);
    expect(dist).toBeGreaterThan(cfg.triggerDistance - amb.v * cfg.dt - 1e-6);
  });

  test("ALERT: ambulance arm green within one intergreen, all others red; CLEARED: amber then red", () => {
    const cfg = rainWith.cfg;
    const alert = rainWith.log.events.find((e) => e.junction === "J1" && e.to === "ALERT")!;
    const s = rainWith.at(alert.t + cfg.signal.amber + cfg.signal.allRed);
    const l = lights(cfg, cfg.junctions.J1, s.controllers.J1, s.t);
    expect(l).toEqual({ in: "GREEN", out: "RED", left: "RED", right: "RED" });
    expect(blue(s.controllers.J1)).toBe("blinking");
    expect(blue(s.controllers.J2)).toBe("steady");

    const cleared = rainWith.log.events.find((e) => e.junction === "J1" && e.to === "CLEARED")!;
    const c1 = rainWith.at(cleared.t + 1);
    expect(lights(cfg, cfg.junctions.J1, c1.controllers.J1, c1.t).in).toBe("AMBER");
    const c2 = rainWith.at(cleared.t + cfg.signal.amber + 1);
    expect(Object.values(lights(cfg, cfg.junctions.J1, c2.controllers.J1, c2.t))).toEqual(["RED", "RED", "RED", "RED"]);
  });

  test("after CLEARED the cycle resumes where it was interrupted", () => {
    const alert = rainWith.log.events.find((e) => e.junction === "J1" && e.to === "ALERT")!;
    const normal = rainWith.log.events.find((e) => e.junction === "J1" && e.to === "NORMAL")!;
    const before = rainWith.at(alert.t).controllers.J1.cycleClock;
    const after = rainWith.at(normal.t).controllers.J1.cycleClock;
    expect(after).toBeCloseTo(before, 6);
  });

  test("without the system nothing changes state and the blue light stays off", () => {
    expect(rainWithout.log.events).toEqual([]);
  });
});

describe("outcomes", () => {
  test("every scenario gets the ambulance through in both modes", () => {
    for (const cfg of Object.values(cfgs)) {
      for (const system of [false, true]) {
        expect(new Simulation(cfg, { system }).result.reachedEnd).toBe(true);
      }
    }
  }, 60_000);

  test("rain: the system is faster, and siren-only stays near the 4.8 km/h traffic speed", () => {
    const w = rainWith.result.timeToClearJ2!;
    const wo = rainWithout.result.timeToClearJ2!;
    expect(w).toBeLessThan(wo);
    const cfg = rainWithout.cfg;
    const dist = cfg.junctions.J2.centreX + cfg.junctions.J2.boxDepth / 2 + cfg.ambulance.length;
    const kmh = (dist / wo) * 3.6;
    expect(kmh).toBeLessThanOrEqual(4.8 * 1.01);
    expect(kmh).toBeGreaterThan(3);
  });

  test("GPS packets every 1.5 s while the ambulance is on screen", () => {
    const g = rainWith.log.gps;
    expect(g.length).toBeGreaterThan(10);
    for (let i = 1; i < g.length; i++) expect(g[i].t - g[i - 1].t).toBeCloseTo(1.5, 6);
  });
});

/** Vehicles per hour of green crossing an arm's stop line, from cycle 2 to 5 (cycle 1 is warm-up). */
function dischargePerHourGreen(cfg: SimConfig, seg: "J1.left"): number {
  const stopX = cfg.segments[seg].stops[0].x;
  const j = cfg.junctions.J1;
  const sim = new Simulation({ ...cfg, maxDuration: 5 * j.cycle }, { system: false });
  const prev = new Map<number, number>();
  let crossed = 0;
  let greenTime = 0;
  for (let t = j.cycle; t < 5 * j.cycle; t += cfg.dt) {
    const s = sim.at(t);
    if (lights(cfg, j, s.controllers.J1, s.t).left === "GREEN") greenTime += cfg.dt;
    for (const v of s.vehicles) {
      if (v.segment !== seg) continue;
      const p = prev.get(v.id);
      if (p !== undefined && p <= stopX && v.x > stopX) crossed++;
      prev.set(v.id, v.x);
    }
  }
  return ((crossed * cfg.vehiclesPerSprite) / greenTime) * 3600;
}

function s11VehPerHourGreen(cfg: SimConfig, lanes: number): number {
  const meanPcu = VEHICLE_TYPES.reduce((s, t) => s + cfg.types[t].share * cfg.types[t].pcu, 0);
  return (525 * lanes * 3.5) / meanPcu;
}

describe("queue discharge vs IRC saturation flow (S11)", () => {
  test("an oversaturated arm at normal speed discharges within 25% of S11", () => {
    // Gurugram J1 left arm with demand tripled so the queue never empties during green.
    const base = cfgs["gurugram-monday-peak"];
    const j1 = base.junctions.J1;
    const arm = { ...j1.arms.left, volumeVehPerHr: j1.arms.left.volumeVehPerHr * 3 };
    const cfg: SimConfig = { ...base, junctions: { ...base.junctions, J1: { ...j1, arms: { ...j1.arms, left: arm } } } };
    const measured = dischargePerHourGreen(cfg, "J1.left");
    const s11 = s11VehPerHourGreen(cfg, arm.lanes);
    console.log(`Gurugram J1.left discharge ${Math.round(measured)} veh/h of green vs S11 ${Math.round(s11)} (${(measured / s11).toFixed(2)}x)`);
    expect(measured / s11).toBeGreaterThan(0.75);
    expect(measured / s11).toBeLessThan(1.25);
  });

  test("report: Silk Board BTM discharge in the rain (4.8 km/h limits flow)", () => {
    const cfg = cfgs["bengaluru-heavy-rain"];
    const measured = dischargePerHourGreen(cfg, "J1.left");
    const s11 = s11VehPerHourGreen(cfg, cfg.junctions.J1.arms.left.lanes);
    console.log(`Rain BTM discharge ${Math.round(measured)} veh/h of green vs S11 ${Math.round(s11)} (${(measured / s11).toFixed(2)}x)`);
    expect(measured).toBeGreaterThan(0);
  });
});

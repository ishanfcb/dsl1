// Turns one scenario in scenarios.json into a fully resolved SimConfig.
// Every number comes from the JSON; this file only does unit conversion and the formulas the JSON names.

import { at, deref, num, obj, pair, scenarioById, type Lookup } from "./data";
import {
  ROLES,
  VEHICLE_TYPES,
  type ArmConfig,
  type JunctionConfig,
  type JunctionId,
  type Role,
  type SegmentConfig,
  type SegmentId,
  type SimConfig,
  type TypeConfig,
  type VehicleType,
} from "./types";

const KMH = 1 / 3.6;

/** S9: max safe speed (km/h) at water depth w (mm). */
export function floodSpeedKmh(ctx: Lookup, depthMm: number): number {
  const c = "global.floodSpeedFunction.coefficients";
  if (depthMm >= num(ctx, `${c}.impassable_mm`)) return 0;
  return num(ctx, `${c}.a`) * depthMm ** 2 + num(ctx, `${c}.b`) * depthMm + num(ctx, `${c}.c`);
}

export function scenarioIds(root: unknown): string[] {
  return ((root as { scenarios: { id: string }[] }).scenarios).map((s) => s.id);
}

export function buildConfig(root: unknown, scenarioId: string): SimConfig {
  const rootNode = root as Record<string, unknown>;
  const ctx: Lookup = { root: rootNode, scenario: scenarioById(rootNode, scenarioId) };
  const geo = at(ctx, "geometry") as Record<string, unknown>;
  const g = (path: string) => num(ctx, path.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], geo));

  // ---- vehicles ----
  const mix = obj(ctx, "sim.vehicleMix");
  const perSprite = num(ctx, "scaling.vehiclesPerSprite");
  const packing = num(ctx, "scaling.spritePlatoon.packing");
  const headwayFactor = num(ctx, "scaling.spritePlatoon.timeHeadwayFactor");
  const types = {} as Record<VehicleType, TypeConfig>;
  for (const t of VEHICLE_TYPES) {
    const s0 = t === "twoWheeler" ? num(ctx, "global.idm.s0_twoWheeler_m") : num(ctx, "global.idm.s0_m");
    const T = t === "twoWheeler" ? num(ctx, "global.idm.T_twoWheeler_s") : num(ctx, "global.idm.T_s");
    const pcu = num(ctx, `global.pcu.${t}`);
    types[t] = {
      share: num(ctx, mix[t]),
      pcu,
      spritePcu: perSprite * pcu,
      length: perSprite * num(ctx, `global.vehicleLength_m.${t}`) * packing,
      s0: perSprite * s0 * packing,
      T: T * headwayFactor,
      speedFactor: num(ctx, `global.idm.desiredSpeed.typeFactor.${t}`),
    };
  }
  const meanPcu = VEHICLE_TYPES.reduce((sum, t) => sum + types[t].share * types[t].pcu, 0);

  // ---- speeds (flood cap from S9 where the scenario has a water depth) ----
  const depthNode = at(ctx, "sim.waterDepth_mm");
  const floodCapKmh = depthNode === null ? null : floodSpeedKmh(ctx, num(ctx, depthNode));
  const capped = (path: string) => {
    const kmh = num(ctx, path);
    return (floodCapKmh === null ? kmh : Math.min(kmh, floodCapKmh)) * KMH;
  };

  // ---- geometry ----
  const laneWidth = g("laneWidth_m");
  const lanes = (j: JunctionId, r: Role) => g(`lanesPerApproach.${j}.${r}`);
  const armName = (j: JunctionId, r: Role) => {
    const arm = (geo.lanesPerApproach as Record<string, Record<string, { name?: string }>>)[j][r];
    return arm.name;
  };
  const crossWidth = (j: JunctionId) => (lanes(j, "left") + lanes(j, "right")) * laneWidth;
  const mainWidth = (j: JunctionId) => (lanes(j, "in") + lanes(j, "out")) * laneWidth;

  const routeLanes = lanes("J1", "in");
  if (lanes("J2", "in") !== routeLanes || lanes("J2", "out") !== routeLanes) {
    throw new Error(`${scenarioId}: J1.in, J2.in and J2.out must have the same lane count`);
  }

  const upstream = g("approachLengthOnScreen_m.upstreamOfJ1");
  const entryBefore = g("ambulanceEntry.distanceBeforeJ1_m");
  if (entryBefore !== upstream) throw new Error(`${scenarioId}: ambulance entry must be at the start of the drawn approach`);
  const d = g("j1ToJ2_m");
  const crossLen = g("approachLengthOnScreen_m.crossArms");
  const downstream = g("approachLengthOnScreen_m.downstreamOfJ2");
  const x1 = upstream;
  const x2 = x1 + d;
  const b1 = crossWidth("J1");
  const b2 = crossWidth("J2");

  // ---- signals and volumes ----
  const amber = num(ctx, "global.signalTiming_chosen.amber_s");
  const allRed = num(ctx, "global.signalTiming_chosen.allRed_s");
  const satCoef = num(ctx, "global.saturationFlow.coefficient");

  const junction = (j: JunctionId, centreX: number, boxDepth: number): JunctionConfig => {
    const plan = obj(ctx, `sim.signalPlan.${j}`);
    const cycle = num(ctx, plan.cycle_s);
    const greens = deref(ctx, plan.green) as Record<string, unknown>;
    const vol = obj(ctx, `sim.volumes.${j}`);
    const arms = {} as Record<Role, ArmConfig>;
    for (const r of ROLES) {
      const name = armName(j, r);
      const greenNode = (name !== undefined && greens[name]) || greens[r];
      if (!greenNode) throw new Error(`${scenarioId}: no green window for ${j}.${r}`);
      const green = pair(ctx, greenNode);
      let volume: number;
      if (j === "J2" && r === "in") {
        volume = 0; // fed by J1's through traffic
      } else if (vol.method === "count") {
        if (name === undefined) throw new Error(`${scenarioId}: counted volumes need arm names at ${j}`);
        const byArm = obj(ctx, `sim.volumes.${j}.counts`);
        const factor = vol.factor === undefined ? 1 : num(ctx, vol.factor);
        volume = num(ctx, byArm[name]) * factor;
      } else {
        const vc = num(ctx, vol.vc);
        const satPcu = satCoef * lanes(j, r) * laneWidth;
        volume = (vc * satPcu * ((green[1] - green[0]) / cycle)) / meanPcu;
      }
      arms[r] = { junction: j, role: r, name, lanes: lanes(j, r), volumeVehPerHr: volume, green };
    }
    return { id: j, cycle, offset: j === "J2" ? num(ctx, "global.signalTiming_chosen.offsetJ1toJ2_s") : 0, centreX, boxDepth, arms };
  };
  const junctions: Record<JunctionId, JunctionConfig> = {
    J1: junction("J1", x1, b1),
    J2: junction("J2", x2, b2),
  };

  // ---- segments ----
  const routeEnd = x2 + b2 / 2 + downstream;
  const segments = {
    route: {
      id: "route",
      lanes: routeLanes,
      spawnArm: { junction: "J1", role: "in" },
      endX: routeEnd,
      stops: [
        { junction: "J1", role: "in", x: x1 - b1 / 2 },
        { junction: "J2", role: "in", x: x2 - b2 / 2 },
      ],
    },
  } as Record<SegmentId, SegmentConfig>;
  const armSegment = (j: JunctionId, r: Exclude<Role, "in">, approach: number, crossing: number) => {
    const id = `${j}.${r}` as SegmentId;
    segments[id] = {
      id,
      lanes: lanes(j, r),
      spawnArm: { junction: j, role: r },
      endX: approach + crossing,
      stops: [{ junction: j, role: r, x: approach }],
    };
  };
  // J1.out's inbound side is the opposite carriageway of the J1–J2 link.
  armSegment("J1", "out", d - (b1 + b2) / 2, b1);
  armSegment("J1", "left", crossLen, mainWidth("J1"));
  armSegment("J1", "right", crossLen, mainWidth("J1"));
  armSegment("J2", "out", downstream, b2);
  armSegment("J2", "left", crossLen, mainWidth("J2"));
  armSegment("J2", "right", crossLen, mainWidth("J2"));

  const ambulanceLane = Math.floor(routeLanes / 2);
  const clearedDuration = num(ctx, "global.system.clearedDuration_s");
  if (clearedDuration !== amber + allRed) throw new Error("global.system.clearedDuration_s must equal amber + all-red");
  if (geo.ambulanceEntry && (geo.ambulanceEntry as { lane?: string }).lane !== "middle") {
    throw new Error(`${scenarioId}: only a centre-lane ambulance entry is supported`);
  }

  return {
    scenarioId,
    title: ctx.scenario.title as string,
    dt: num(ctx, "global.simulation.dt_s"),
    warmUp: num(ctx, "global.simulation.warmUp_cycles") * junctions.J1.cycle,
    maxDuration: num(ctx, "global.simulation.maxDuration_s"),
    keyframeInterval: num(ctx, "global.simulation.keyframeInterval_s"),
    seed: num(ctx, "global.simulation.seed"),
    timeCompression: num(ctx, "scaling.timeCompression"),
    vehiclesPerSprite: perSprite,
    types,
    idm: { a: num(ctx, "global.idm.a_mps2"), b: num(ctx, "global.idm.b_mps2"), delta: num(ctx, "global.idm.delta") },
    desiredSpeed: {
      sd: num(ctx, "global.idm.desiredSpeed.sd"),
      min: num(ctx, "global.idm.desiredSpeed.min"),
      max: num(ctx, "global.idm.desiredSpeed.max"),
    },
    trafficSpeed: capped("sim.trafficSpeed_kmh"),
    floodCapKmh,
    ambulance: {
      length: num(ctx, "global.ambulance.length_m"),
      s0: num(ctx, "global.idm.s0_m"),
      T: num(ctx, "global.idm.T_s"),
      speedNoSystem: capped("sim.ambulanceSpeed_noSystem_kmh"),
      speedWithSystem: capped("sim.ambulanceSpeed_withSystem_kmh"),
    },
    routeLanes,
    ambulanceLane,
    junctions,
    segments,
    j1FarEdge: x1 + b1 / 2,
    j1ThroughShare: num(ctx, "sim.j1ThroughShare"),
    signal: { amber, allRed },
    stopLine: {
      pcuPerLaneSecond: (satCoef * laneWidth) / 3600,
      carryCap: Math.max(...VEHICLE_TYPES.map((t) => types[t].spritePcu)),
    },
    clearedDuration,
    triggerEta: num(ctx, "global.system.triggerEta_s"),
    triggerDistance: num(ctx, "global.system.triggerDistance_m"),
    gpsInterval: num(ctx, "global.system.gpsInterval_s"),
  };
}

// Wording for the Sources sheet: which numbers from scenarios.json it lists, in plain words, grouped by topic.
// Only labels and units live here; every value, source, kind and note is read from scenarios.json.
// Paths are as in scenarios.json, relative to the scenario unless they start with "global." or "scaling.".
// A row whose path the scenario doesn't have (e.g. Silk Board counts in Gurgaon) is left out, and so is a row
// that resolves to a number an earlier row already showed.

export interface SheetRow {
  label: string;
  path: string;
  unit?: string;
  /** Show a 0–1 share as a percentage. */
  pct?: boolean;
  /** Label to use instead when a later row turns out to be the same number (e.g. both junctions share a plan). */
  shared?: string;
}

export interface SheetGroup {
  title: string;
  rows: SheetRow[];
}

export const SHEET_GROUPS: SheetGroup[] = [
  {
    title: "Speeds",
    rows: [
      { label: "Traffic speed", path: "sim.trafficSpeed_kmh", unit: "km/h" },
      { label: "Ambulance, siren only", path: "sim.ambulanceSpeed_noSystem_kmh", unit: "km/h" },
      { label: "Ambulance target, with the system", path: "sim.ambulanceSpeed_withSystem_kmh", unit: "km/h" },
      { label: "Water on the road", path: "sim.waterDepth_mm", unit: "mm" },
      { label: "Silk Board peak speed, dry (cross-check)", path: "silkBoardPeakSpeed_kmh", unit: "km/h" },
      { label: "Bengaluru evening peak, dry (context)", path: "corridorSpeed_dry_kmh", unit: "km/h" },
    ],
  },
  {
    title: "Traffic volume",
    rows: [
      { label: "Vehicles per hour through Silk Board", path: "signal_J1_SilkBoard.volume_vehPerHr_total", unit: "veh/h" },
      { label: "From BTM Layout", path: "signal_J1_SilkBoard.volume_vehPerHr_byArm.BTM_Layout", unit: "veh/h" },
      { label: "From HSR Layout", path: "signal_J1_SilkBoard.volume_vehPerHr_byArm.HSR_Layout", unit: "veh/h" },
      { label: "From Hosur Road, north", path: "signal_J1_SilkBoard.volume_vehPerHr_byArm.Hosur_N", unit: "veh/h" },
      { label: "From Hosur Road, south (the ambulance's road)", path: "signal_J1_SilkBoard.volume_vehPerHr_byArm.Hosur_S", unit: "veh/h" },
      { label: "Load at both junctions (traffic ÷ capacity)", path: "signal.volumeToCapacity", pct: true },
      { label: "Load at J2 (traffic ÷ capacity)", path: "sim.volumes.J2.vc", pct: true },
      { label: "Road width per approach", path: "signal.approachWidth_m", unit: "m" },
      { label: "Capacity per hour of green", path: "signal.saturationFlow_pcuPerHr", unit: "car units" },
      { label: "Traffic carrying on from J1 to J2", path: "sim.j1ThroughShare", pct: true },
    ],
  },
  {
    title: "Vehicle mix",
    rows: [
      { label: "Two-wheelers", path: "sim.vehicleMix.twoWheeler", pct: true },
      { label: "Cars", path: "sim.vehicleMix.car", pct: true },
      { label: "Autos", path: "sim.vehicleMix.auto", pct: true },
      { label: "Buses and others", path: "sim.vehicleMix.bus", pct: true },
      { label: "Two-wheeler size, in car units", path: "global.pcu.twoWheeler" },
      { label: "Auto size, in car units", path: "global.pcu.auto" },
      { label: "Bus size, in car units", path: "global.pcu.bus" },
    ],
  },
  {
    title: "Signals",
    rows: [
      { label: "J1 signal cycle", path: "sim.signalPlan.J1.cycle_s", unit: "s", shared: "Signal cycle, J1 and J2" },
      { label: "J2 signal cycle", path: "sim.signalPlan.J2.cycle_s", unit: "s" },
      { label: "Amber", path: "global.signalTiming_chosen.amber_s", unit: "s" },
      { label: "All-red", path: "global.signalTiming_chosen.allRed_s", unit: "s" },
    ],
  },
  {
    title: "The road",
    rows: [
      { label: "J1 to J2", path: "geometry.j1ToJ2_m", unit: "m" },
      { label: "Road before J1", path: "geometry.approachLengthOnScreen_m.upstreamOfJ1", unit: "m" },
      { label: "Road after J2", path: "geometry.approachLengthOnScreen_m.downstreamOfJ2", unit: "m" },
      { label: "Lanes on the ambulance's road", path: "geometry.lanesPerApproach.J1.in", unit: "lanes" },
      { label: "Lane width", path: "geometry.laneWidth_m", unit: "m" },
    ],
  },
  {
    title: "The system",
    rows: [
      { label: "Switches on when the ambulance is this far away in time", path: "global.system.triggerEta_s", unit: "s" },
      { label: "…or this close, whichever comes first", path: "global.system.triggerDistance_m", unit: "m" },
      { label: "GPS packet from the ambulance every", path: "global.system.gpsInterval_s", unit: "s" },
      { label: "Hand-back to the normal cycle", path: "global.system.clearedDuration_s", unit: "s" },
    ],
  },
  {
    title: "How vehicles drive",
    rows: [
      { label: "Fastest speed-up", path: "global.idm.a_mps2", unit: "m/s²" },
      { label: "Comfortable braking", path: "global.idm.b_mps2", unit: "m/s²" },
      { label: "Time gap to the vehicle in front", path: "global.idm.T_s", unit: "s" },
      { label: "Time gap, two-wheelers", path: "global.idm.T_twoWheeler_s", unit: "s" },
      { label: "Gap when stopped", path: "global.idm.s0_m", unit: "m" },
      { label: "Spread of preferred speeds", path: "global.idm.desiredSpeed.sd", pct: true },
    ],
  },
  {
    title: "The simulation",
    rows: [
      { label: "Playback speed-up", path: "scaling.timeCompression", unit: "×" },
      { label: "Vehicles moved as one group", path: "scaling.vehiclesPerSprite" },
      { label: "Signal cycles run before the ambulance appears", path: "global.simulation.warmUp_cycles" },
      { label: "Time step", path: "global.simulation.dt_s", unit: "s" },
    ],
  },
  {
    title: "Why a siren is not enough",
    rows: [
      { label: "How far a siren carries into a car at a junction", path: "global.driver.sirenEffectiveRange_urbanIntersection_m", unit: "m" },
      { label: "Drivers who place the siren correctly, windows shut", path: "global.driver.sirenLocalisedCorrectly_windowsClosed", pct: true },
      { label: "Driver reaction time", path: "global.driver.perceptionReaction_s", unit: "s" },
      { label: "Ambulance drivers who say motorists don't give way", path: "global.driver.motoristsDontYield", pct: true },
    ],
  },
];

/** The four kinds, as the sheet names them. */
export const KIND_LABEL = {
  sourced: "Sourced",
  derived: "Calculated",
  proxy: "Proxy",
  assumption: "Assumption",
} as const;

export const KIND_HINT = {
  sourced: "Taken directly from the source.",
  derived: "Calculated from sourced numbers.",
  proxy: "Real data from a similar place.",
  assumption: "No public data found; our estimate.",
} as const;

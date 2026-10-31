// Shared engine types. All distances in metres, speeds in m/s, times in real seconds.

export type VehicleType = "twoWheeler" | "car" | "auto" | "bus";
export const VEHICLE_TYPES: readonly VehicleType[] = ["twoWheeler", "car", "auto", "bus"];

export type JunctionId = "J1" | "J2";
export const JUNCTIONS: readonly JunctionId[] = ["J1", "J2"];

/** Arm role relative to the ambulance: it arrives on `in` and leaves on `out`. */
export type Role = "in" | "out" | "left" | "right";
export const ROLES: readonly Role[] = ["in", "out", "left", "right"];

export type JunctionState = "NORMAL" | "PREWARN" | "ALERT" | "CLEARED";
export type Light = "GREEN" | "AMBER" | "RED";
export type BlueLight = "off" | "steady" | "blinking";

/** "route" runs J1.in → J1 → link (= J2.in) → J2 → J2.out. Every other arm is its own segment. */
export type SegmentId = "route" | `${JunctionId}.${Exclude<Role, "in">}`;

// ---------- resolved configuration (built from scenarios.json by config.ts) ----------

export interface TypeConfig {
  share: number;
  pcu: number;
  /** PCU of one sprite (vehiclesPerSprite x pcu). */
  spritePcu: number;
  /** Sprite (platoon) values, already scaled from per-vehicle values. */
  length: number;
  s0: number;
  T: number;
  speedFactor: number;
}

export interface ArmConfig {
  junction: JunctionId;
  role: Role;
  name?: string;
  lanes: number;
  /** Inbound volume in real vehicles per hour. 0 for J2.in, which is fed by J1. */
  volumeVehPerHr: number;
  /** Green window [start, end) in cycle seconds. */
  green: [number, number];
}

export interface JunctionConfig {
  id: JunctionId;
  cycle: number;
  offset: number;
  /** Junction centre on the route coordinate. */
  centreX: number;
  /** Depth of the junction box along the route (= cross-road width). */
  boxDepth: number;
  arms: Record<Role, ArmConfig>;
}

export interface SegmentConfig {
  id: SegmentId;
  lanes: number;
  /** Where vehicles enter. */
  spawnArm?: { junction: JunctionId; role: Role };
  /** Coordinate where vehicles are removed. */
  endX: number;
  /** Stop lines on this segment, in travel order. */
  stops: { junction: JunctionId; role: Role; x: number }[];
}

export interface SimConfig {
  scenarioId: string;
  title: string;
  dt: number;
  warmUp: number;
  maxDuration: number;
  keyframeInterval: number;
  seed: number;
  timeCompression: number;
  vehiclesPerSprite: number;
  types: Record<VehicleType, TypeConfig>;
  idm: { a: number; b: number; delta: number };
  desiredSpeed: { sd: number; min: number; max: number };
  /** Scenario traffic speed after any flood cap, m/s. */
  trafficSpeed: number;
  floodCapKmh: number | null;
  ambulance: { length: number; s0: number; T: number; speedNoSystem: number; speedWithSystem: number };
  routeLanes: number;
  middleLane: number;
  junctions: Record<JunctionId, JunctionConfig>;
  segments: Record<SegmentId, SegmentConfig>;
  /** Route coordinate where J1's box ends (turning vehicles leave here). */
  j1FarEdge: number;
  j1ThroughShare: number;
  signal: { amber: number; allRed: number };
  /** Stop-line capacity per lane (S11), PCU per second of green, and the most a lane can carry over. */
  stopLine: { pcuPerLaneSecond: number; carryCap: number };
  clearedDuration: number;
  triggerDistance: number;
  gpsInterval: number;
  driver: {
    reaction: number;
    laneChange: number;
    compliance: number;
    sirenRange: number;
    sirenYield: number;
  };
}

// ---------- simulation state (what views read) ----------

export interface Vehicle {
  id: number;
  type: VehicleType | "ambulance";
  segment: SegmentId;
  /** Front position along the segment. */
  x: number;
  v: number;
  v0: number;
  length: number;
  s0: number;
  T: number;
  lane: number;
  /** Set while moving out of the middle lane. */
  targetLane: number | null;
  changeStart: number | null;
  /** Time the driver starts moving over (after perception-reaction). */
  reactAt: number | null;
  willTurn: boolean;
  /** Junction whose stop line this vehicle has been given capacity to cross. */
  admitted: JunctionId | null;
  compliesBlue: boolean;
  yieldsSiren: boolean;
  prefersRight: boolean;
}

export interface ControllerState {
  state: JunctionState;
  /** Seconds into the cycle. Frozen while ALERT or CLEARED. */
  cycleClock: number;
  since: number;
  /** Arms that were green or amber when ALERT began. */
  activeAtAlert: Role[];
  blueOnSince: number | null;
}

export interface ArmSpawnState {
  rng: number;
  nextArrival: number;
  /** Sprites waiting off-screen, oldest first. */
  backlog: Vehicle[];
}

export interface GpsPacket {
  t: number;
  /** Route coordinate; lat/lon come with the OSM map. */
  x: number;
  speed: number;
  /** null on the abstract map; set once routes come from OSM. */
  headingDeg: number | null;
  distToJ1: number;
  distToJ2: number;
}

export interface StateEvent {
  t: number;
  junction: JunctionId;
  from: JunctionState;
  to: JunctionState;
}

export interface AmbulanceLog {
  enteredAt: number | null;
  passedJ1At: number | null;
  passedJ2At: number | null;
  exitedAt: number | null;
}

export interface SimState {
  step: number;
  t: number;
  nextId: number;
  vehicles: Vehicle[];
  ambulanceId: number | null;
  controllers: Record<JunctionId, ControllerState>;
  spawns: Record<string, ArmSpawnState>;
  /** Unused stop-line capacity in PCU, keyed "J1.left.0" (junction.role.lane). */
  stopBudget: Record<string, number>;
  ambulance: AmbulanceLog;
  nextGpsAt: number | null;
}

/** Append-only record of a full run. Kept outside SimState so keyframes stay small. */
export interface RunLog {
  gps: GpsPacket[];
  events: StateEvent[];
}

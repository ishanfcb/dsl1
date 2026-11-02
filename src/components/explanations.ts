// The hover notes' wording, in one place: one plain sentence per thing on screen, for a viewer with nobody
// beside them. Numbers inside come from the scenario's config, never typed in here.
import type { JunctionState, SimConfig } from "../engine";

export const STATE_EXPLAIN: Record<JunctionState, string> = {
  NORMAL: "Normal cycle: the signal runs its usual timings. No ambulance is near.",
  PREWARN: "Prewarn: the blue light is on, steady. This signal has turned green for the ambulance's road early, so its queue clears before the ambulance arrives.",
  ALERT: "Alert: the blue light is blinking. Green for the ambulance, red for every other road.",
  CLEARED: "Cleared: the ambulance has passed. A short amber and all-red, then the normal cycle carries on where it stopped.",
};

/** Route lengths for the journey notes, read from the engine's layout. */
function stretch(cfg: SimConfig) {
  const before = cfg.junctions.J1.centreX;
  const j2 = cfg.junctions.J2;
  const after = cfg.segments.route.endX - j2.centreX - j2.boxDepth / 2;
  const m = (v: number) => Math.round(v).toLocaleString("en-IN");
  return { before: m(before), after: m(after), total: m(cfg.segments.route.endX) };
}

export const explain = {
  place: "Where this scenario is set. The junction names, traffic counts and signal timings are the real junction's; the 3D streets are an OpenStreetMap stand-in for that area.",
  when: "Time of day and weather for this scenario.",
  trafficSpeed: "Average speed of traffic in this scenario. Each simulated vehicle drives at its own speed around this.",
  timeSaved: "How much sooner the ambulance gets through with the system: journey time without, minus journey time with.",
  estimated: "Worked out by our simulation of the same traffic run twice, with and without the system. Not measured on a real road.",
  toggle: "Replay the same traffic with the blue-light system off or on. Keyboard: S.",
  clock: (cfg: SimConfig) =>
    `Real time since the ambulance appeared. Playback runs ${cfg.timeCompression}x faster than real life so a long trip fits on screen; speeds are never changed.`,
  runWithout: (cfg: SimConfig) => {
    const s = stretch(cfg);
    return `Journey time with only a siren: from ${s.before} m before J1 to ${s.after} m past J2 (${s.total} m). Ticks mark when it passed each junction.`;
  },
  runWith: (cfg: SimConfig) => {
    const s = stretch(cfg);
    return `Journey time with the blue-light system, same traffic, same ${s.total} m. Ticks mark when it passed each junction.`;
  },
  ambulanceWith: "The fastest the ambulance aims to drive with the system. Traffic ahead in its lane usually holds it lower.",
  ambulanceWithout: "The ambulance's speed with only a siren: no faster than the traffic, since drivers ahead can't hear it in time.",
  triggerEta: "The junction turns green once the ambulance is this many seconds away: the 760 m of a real Bengaluru pilot, at a clear-road 29 km/h.",
  triggerDistance: "Backup: the junction also turns green once the ambulance is this close, so one stuck in traffic still gets through.",
  sirenRange: "How close a driver at a junction must be to hear a siren inside their car.",
  queuedBelow: "Traffic moving slower than this counts as part of the queue.",
  cycle: "Where this signal is in its repeating round of greens. It stands still while the system has control, then carries on.",
  cycleLength: "How long this signal takes to give every road its green once, before starting again.",
  legend: "A hollow circle marks a number that is a proxy (real data from a similar place) or an assumption (no public data found). Hover any number for its source.",
  step: "Where the ambulance is in its trip past the two junctions.",
  cityToggle: "Switch between the Gurugram and Bengaluru scenarios.",
  modeToggle: "Automated plays the scenario on a loop (Space pauses). Scroll lets the scroll wheel move through time. Keyboard: Shift+Space.",
  navMap: "Overview of the whole route and both junctions.",
  navJunction: "Close-up of one junction: its signals, lanes and queues.",
  pin: "A junction on the ambulance's route, with what its signal is doing now. Click to zoom in.",
  approach: {
    in: "The road the ambulance arrives on.",
    out: "The road straight ahead, where oncoming traffic comes from.",
    left: "The cross road on the ambulance's left.",
    right: "The cross road on the ambulance's right.",
  },
  light: "The light this road is showing now.",
  queue: "Length of the standing queue on this road (its longest lane), and roughly how many vehicles are in it.",
} as const;

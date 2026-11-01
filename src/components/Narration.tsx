// Top-right of the visual: what is happening right now, in two plain lines, for a viewer with nobody beside them
// to explain it. Read from engine state at the current time; the headline changes with the phase of the run,
// and the live distance and speed update inside it.
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Simulation, SimState } from "../engine";
import type { ScenarioView } from "../views/useScenario";
import { DataBadge } from "./DataBadge";
import { Explain } from "./Explain";
import { explain } from "./explanations";
import { formatMinSec } from "./RunChart";
import { ambulanceOf } from "../scene/vehiclePose";

type Phase = "waiting" | "toJ1" | "greenJ1" | "toJ2" | "done";

interface Line {
  phase: Phase;
  headline: ReactNode;
  detail: ReactNode;
}

function describe(sc: ScenarioView, sim: Simulation, s: Readonly<SimState>): Line {
  const { cfg } = sc;
  const { J1, J2 } = sc.names;
  const a = s.ambulance;
  const amb = ambulanceOf(s);
  const system = sim.system;
  const siren = <DataBadge node={sc.sirenRange} unit="m" digits={0} explain={explain.sirenRange} />;
  const eta = <DataBadge node={sc.triggerEta} unit="s" digits={0} explain={explain.triggerEta} />;
  const backup = <DataBadge node={sc.triggerDistance} unit="m" digits={0} explain={explain.triggerDistance} />;

  if (a.enteredAt === null || (!amb && a.passedJ2At === null)) {
    return { phase: "waiting", headline: "No ambulance on the road yet.", detail: "Both signals run their normal cycle." };
  }
  if (a.passedJ2At !== null) {
    const took = formatMinSec(a.passedJ2At - a.enteredAt);
    const saved = sc.runs.timeSaved;
    return {
      phase: "done",
      headline: `Through both junctions, ${took} after joining the road.`,
      detail:
        saved === null || saved === 0
          ? "Both signals are back to their normal cycle."
          : system
            ? `Both signals are back to normal. The system saved ${formatMinSec(saved)} on this trip.`
            : `The same trip with the system is ${formatMinSec(saved)} faster.`,
    };
  }

  const target = a.passedJ1At === null ? "J1" : "J2";
  const d = Math.max(0, Math.round(cfg.junctions[target].centreX - amb!.x));
  const stuck = amb!.v < sc.queuedBelowMs;
  const pace = stuck
    ? `It is stuck in traffic at ${Math.round(amb!.v * 3.6)} km/h.`
    : `About ${formatMinSec(d / amb!.v)} away at ${Math.round(amb!.v * 3.6)} km/h.`;

  if (target === "J2") {
    return {
      phase: "toJ2",
      headline: `Through ${J1}. ${d} m to ${J2}.`,
      detail: system ? (
        `${J2} is green for it, blue light blinking. ${J1} goes back to its normal cycle.`
      ) : (
        <>{pace} Drivers ahead hear the siren only within {siren}.</>
      ),
    };
  }

  const alert = system ? sim.log.events.find((e) => e.junction === "J1" && e.to === "ALERT") : undefined;
  if (alert && s.t >= alert.t) {
    const byEta = (alert.ambulanceDist ?? 0) > sc.triggerDistance.value;
    return {
      phase: "greenJ1",
      headline: `${J1} is green for the ambulance, ${d} m ahead.`,
      detail: byEta ? (
        <>
          It switched {Math.round(alert.ambulanceDist!)} m out, when the ambulance was{" "}
          {eta} away. {J2} is green too, so its queue clears early.
        </>
      ) : (
        <>
          It switched at {backup}, the backup for a slow ambulance. {J2} is green
          too, so its queue clears early.
        </>
      ),
    };
  }

  return {
    phase: "toJ1",
    headline: `Ambulance is ${d} m from ${J1}.`,
    detail: system ? (
      <>
        {pace} {J1} reads its GPS and turns green at {eta} away, or {backup}.
      </>
    ) : (
      <>{pace} No system: drivers hear the siren only within {siren}.</>
    ),
  };
}

const STEPS: Record<"with" | "without", Phase[]> = {
  with: ["toJ1", "greenJ1", "toJ2", "done"],
  without: ["toJ1", "toJ2", "done"],
};

export function Narration({ sc, sim, state, reducedMotion }: {
  sc: ScenarioView;
  sim: Simulation;
  state: Readonly<SimState>;
  reducedMotion: boolean;
}) {
  const line = describe(sc, sim, state);
  const steps = STEPS[sim.system ? "with" : "without"];
  const step = steps.indexOf(line.phase) + 1;
  const fade = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.35, ease: "easeOut" as const } };
  return (
    <div className="narration">
      <div className="narration__head">
        <span>{sim.system ? "With system" : "Without system"}</span>
        {step > 0 && <Explain className="narration__step" tip={{ body: explain.step }}>{`Step ${step} of ${steps.length}`}</Explain>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${sim.system}-${line.phase}`} {...fade}>
          <p className="narration__headline">{line.headline}</p>
          <p className="narration__detail">{line.detail}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

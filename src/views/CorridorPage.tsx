// Map and Junction pages share this shell, one 3D scene and one timeline: switching between them only moves
// the camera and swaps the side caption, so the moment on screen never changes. Holds no simulation state.
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { JunctionId } from "../engine";
import { useKeyboard } from "../input/useKeyboard";
import { useTimeline } from "../input/useTimeline";
import { CityScene } from "../scene/CityScene";
import { DataBadge } from "../components/DataBadge";
import { PhaseTimeline } from "../components/PhaseTimeline";
import { RealTimeClock } from "../components/RealTimeClock";
import { TimeSaved } from "../components/TimeSaved";
import { useEngineTime } from "../components/useEngineTime";
import { Caption } from "../shell/Caption";
import { Frame } from "../shell/Frame";
import { Masthead } from "../shell/Masthead";
import { hrefOf, type Route } from "../shell/useRoute";
import { JunctionSide, JunctionStory } from "./JunctionView";
import { MapSide, MapStory } from "./MapView";
import { useScenario } from "./useScenario";

const SCENARIO = "gurugram-monday-peak";
/** Real seconds shown before the ambulance enters, so the view opens on moving traffic. */
const LEAD_IN_S = 5;

/** `?t=60` opens 60 real seconds after the ambulance enters (for screenshots and rehearsals). */
const openAtParam = new URLSearchParams(window.location.search).get("t");
const openAt = openAtParam === null ? null : Number(openAtParam);

/** The pages ← → step through, in nav order. */
const ORDER: Route[] = [{ page: "map" }, { page: "junction", junction: "J1" }];

export function CorridorPage({ route }: { route: Exclude<Route, { page: "debug" }> }) {
  const sc = useScenario(SCENARIO);
  const reducedMotion = useReducedMotion() ?? false;
  const [system, setSystem] = useState(true);
  const sim = system ? sc.runs.withSystem : sc.runs.without;
  const entered = sim.result.ambulance.enteredAt ?? 0;
  const focus: JunctionId | null = route.page === "junction" ? route.junction : null;

  const timeline = useTimeline({
    start: Math.max(0, entered - LEAD_IN_S),
    end: sim.duration,
    compression: sc.cfg.timeCompression,
    reducedMotion,
    initial: openAt === null ? undefined : entered + openAt,
  });
  useKeyboard({
    onPlayPause: timeline.togglePlay,
    onToggleSystem: () => setSystem((s) => !s),
    onPage: (step) => {
      const i = ORDER.findIndex((r) => r.page === route.page);
      const next = ORDER[i + step];
      if (next) window.location.hash = hrefOf(next);
    },
    onBack: () => {
      if (focus) window.location.hash = hrefOf({ page: "map" });
    },
  });

  const t = useEngineTime(timeline.time);
  const state = sim.at(t);
  const sceneData = useMemo(
    () => ({ sim, cfg: sc.cfg, corridor: sc.corridor, time: timeline.time, reducedMotion }),
    [sim, sc, timeline.time, reducedMotion],
  );
  const fade = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.35, ease: "easeOut" as const } };

  return (
    <div className="page">
      <Masthead active={focus ? "Junction" : "Map"} />

      <main className="stage">
        <h2 className="section-label">{focus ? "Junction" : "Map"}</h2>
        <Frame credit="© OpenStreetMap contributors">
          <CityScene data={sceneData} junctionNames={sc.names} focus={focus} />
        </Frame>
        <aside className="side" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={focus ?? "map"} {...fade}>
              {focus ? <JunctionSide sc={sc} state={state} junction={focus} /> : <MapSide state={state} names={sc.names} />}
            </motion.div>
          </AnimatePresence>
        </aside>
        <Caption
          name={<>{sc.place} · {sc.dayTime}<br /><DataBadge node={sc.speed} unit="km/h" /></>}
          middle={
            <PhaseTimeline
              current={system ? sc.marks.with : sc.marks.without}
              other={system ? sc.marks.without : sc.marks.with}
              currentLabel={system ? "With" : "Without"}
              otherLabel={system ? "Without" : "With"}
              now={t - entered}
            />
          }
          value={
            <TimeSaved
              seconds={sc.runs.timeSaved}
              source={<>Engine, same seed · ambulance <DataBadge node={sc.ambulanceWith} unit="km/h" /> vs <DataBadge node={sc.ambulanceWithout} unit="km/h" /></>}
            />
          }
        />
      </main>

      <footer className="foot">
        <div className="legend">
          <RealTimeClock elapsed={t - entered} compression={sc.compression} />
          <div className="toggle" role="group" aria-label="System">
            <span className="status__label">System</span>
            <button aria-pressed={!system} onClick={() => setSystem(false)}>Without</button>
            {" / "}
            <button aria-pressed={system} onClick={() => setSystem(true)}>With</button>
          </div>
          <div title="Proxy: real data from a similar place. Assumption: no public data found. Hover a value for its note.">
            <span className="badge__mark legend__mark" aria-hidden="true" /> Proxy / assumption
          </div>
        </div>
        <p className="story">
          {focus ? <JunctionStory sc={sc} junction={focus} /> : <MapStory place={sc.place} destination={sc.destination} />}
        </p>
      </footer>
    </div>
  );
}

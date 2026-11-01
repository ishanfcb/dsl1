// Map and Junction pages share this layout, one 3D scene and one timeline: switching between them only moves
// the camera and swaps the panel text, so the moment on screen never changes. Holds no simulation state.
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { JunctionId } from "../engine";
import { useKeyboard } from "../input/useKeyboard";
import { useTimeline } from "../input/useTimeline";
import { CityScene } from "../scene/CityScene";
import { DataBadge } from "../components/DataBadge";
import { formatMinSec, RunChart } from "../components/RunChart";
import { RealTimeClock } from "../components/RealTimeClock";
import { useEngineTime } from "../components/useEngineTime";
import { Frame } from "../shell/Frame";
import { Masthead } from "../shell/Masthead";
import { Section } from "../shell/Section";
import { hrefOf, type Route } from "../shell/useRoute";
import { JunctionSide, JunctionStory } from "./JunctionView";
import { MapSide, MapStory } from "./MapView";
import { CityToggle } from "./CityToggle";
import { useScenario } from "./useScenario";

/** Real seconds shown before the ambulance enters, so the view opens on moving traffic. */
const LEAD_IN_S = 5;

/** `?t=60` opens 60 real seconds after the ambulance enters (for screenshots and rehearsals). */
const openAtParam = new URLSearchParams(window.location.search).get("t");
const openAt = openAtParam === null ? null : Number(openAtParam);

/** The pages ← → step through, in nav order. */
const ORDER: Route[] = [{ page: "map" }, { page: "junction", junction: "J1" }];

export function CorridorPage({ route, scenario, onScenario }: {
  route: Exclude<Route, { page: "debug" }>;
  /** Shown scenario. Changing it keeps the 3D canvas alive and restarts the timeline. */
  scenario: string;
  onScenario(id: string): void;
}) {
  const sc = useScenario(scenario);
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
    resetKey: scenario,
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
      <aside className="panel">
        <Masthead active={focus ? "Junction" : "Map"} />

        <div className="panel__body">
          <header className="intro">
            <h2 className="title">{focus ? "Junction close-up" : "Corridor overview"}</h2>
            <dl className="meta">
              <div><dt>Place</dt><dd>{sc.place}</dd></div>
              <div><dt>When</dt><dd>{sc.dayTime}</dd></div>
              <div><dt>Traffic</dt><dd><DataBadge node={sc.speed} unit="km/h" /></dd></div>
            </dl>
            <p className="story">
              {focus ? <JunctionStory sc={sc} junction={focus} /> : <MapStory place={sc.place} destination={sc.destination} conditions={sc.conditions} />}
            </p>
          </header>

          <Section label="Time saved">
            <div className="saved">
              {/* The label says "time saved"; a run where the system loses time shows as negative. */}
              {sc.runs.timeSaved === null ? "No result" : `${sc.runs.timeSaved < 0 ? "−" : ""}${formatMinSec(sc.runs.timeSaved)}`}
              <span className="saved__estimate">*estimated</span>
            </div>
            <div className="row">
              <div className="toggle" role="group" aria-label="System">
                <button aria-pressed={!system} onClick={() => setSystem(false)}>Without</button>
                <button aria-pressed={system} onClick={() => setSystem(true)}>With system</button>
              </div>
              <RealTimeClock elapsed={t - entered} />
            </div>
            <RunChart without={sc.marks.without} withSystem={sc.marks.with} system={system} now={t - entered} />
            <p className="note">
              *Estimated by the simulation: same traffic, same seed, run with and without the system. Ambulance <DataBadge node={sc.ambulanceWith} unit="km/h" /> with the system, <DataBadge node={sc.ambulanceWithout} unit="km/h" /> without.
            </p>
          </Section>

          <Section label={focus ? `${focus} · ${sc.names[focus]}` : "Signals"}>
            <div aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={focus ?? "map"} {...fade}>
                  {focus ? <JunctionSide sc={sc} state={state} junction={focus} /> : <MapSide state={state} names={sc.names} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </Section>
        </div>

        <footer className="panel__foot" title="Proxy: real data from a similar place. Assumption: no public data found. Hover a value for its note.">
          <span className="badge__mark legend__mark" aria-hidden="true" /> Proxy or assumption · hover for the note
        </footer>
      </aside>

      <main className="stage">
        <Frame credit="© OpenStreetMap contributors">
          <CityScene data={sceneData} junctionNames={sc.names} focus={focus} />
          <CityToggle current={scenario} onChange={onScenario} />
        </Frame>
      </main>
    </div>
  );
}

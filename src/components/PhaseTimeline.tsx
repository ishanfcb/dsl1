// The ambulance's run as a thin line from entry to exit, with a tick at each phase, for the run on
// screen and (greyed, beneath) the other run, on one shared real-time scale so their lengths compare.
import { useEffect, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import type { Simulation } from "../engine";

export const PHASES = ["Approaching J1", "Passed J1", "Approaching J2", "Passed J2"] as const;

export interface RunMarks {
  /** Seconds after entry for each phase in PHASES; null if the run never got there. */
  ticks: (number | null)[];
  /** Seconds from entry to leaving the corridor. */
  end: number;
}

/** Time the ambulance reached route coordinate x, interpolated between GPS packets. */
function timeAtX(sim: Simulation, x: number): number | null {
  const g = sim.log.gps;
  for (let i = 1; i < g.length; i++) {
    if (g[i].x >= x) {
      const f = (x - g[i - 1].x) / Math.max(1e-9, g[i].x - g[i - 1].x);
      return g[i - 1].t + f * (g[i].t - g[i - 1].t);
    }
  }
  return null;
}

/**
 * Phase moments of a run. Approaching J1 = enters J1's trigger radius (J1 starts blinking);
 * Approaching J2 = J2 starts blinking, which by the n+1 rule is the moment it passes J1.
 * The run without the system uses the same positions, so the two lines compare like for like.
 */
export function runMarks(sim: Simulation): RunMarks {
  const a = sim.result.ambulance;
  const t0 = a.enteredAt ?? 0;
  const rel = (t: number | null) => (t === null ? null : t - t0);
  const j1 = sim.cfg.junctions.J1.centreX;
  return {
    ticks: [rel(timeAtX(sim, j1 - sim.cfg.triggerDistance)), rel(a.passedJ1At), rel(a.passedJ1At), rel(a.passedJ2At)],
    end: rel(a.exitedAt) ?? sim.duration - t0,
  };
}

/** Drawn in CSS pixels at the box's measured width, so type stays at the shell's size. */
const ROW_H = 20;
const LABEL_W = 72;
const LINE_H = 12;
/** Uppercase width per character, as a share of the font size (Inter + the label's letter-spacing). */
const CHAR_EM = 0.72;

function useBox() {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 600, font: 10 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: Math.max(200, e.contentRect.width), font: parseFloat(getComputedStyle(el).fontSize) * 0.85 }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function PhaseTimeline({ current, other, currentLabel, otherLabel, now }: {
  current: RunMarks;
  other: RunMarks;
  currentLabel: string;
  otherLabel: string;
  /** Seconds since entry on the run on screen. */
  now: number;
}) {
  const [ref, { w: W, font }] = useBox();
  const x = scaleLinear().domain([0, Math.max(current.end, other.end)]).range([LABEL_W, W - 1]);

  // Ticks that fall on the same moment share one mark; their names stack. Labels that would
  // overlap a neighbour move up a line, with a thin leader down to their tick.
  const groups: { t: number; names: string[]; base: number }[] = [];
  current.ticks.forEach((t, i) => {
    if (t === null) return;
    const g = groups.find((gr) => Math.abs(gr.t - t) < 0.5);
    if (g) g.names.push(PHASES[i]);
    else groups.push({ t, names: [PHASES[i]], base: 0 });
  });
  groups.sort((a, b) => a.t - b.t);
  const span = (g: (typeof groups)[number]) => {
    const half = (Math.max(...g.names.map((n) => n.length)) * CHAR_EM * font) / 2 + 6;
    return [x(g.t) - half, x(g.t) + half];
  };
  groups.forEach((g, i) => {
    const [l] = span(g);
    for (const prev of groups.slice(0, i)) {
      if (span(prev)[1] > l && prev.base + prev.names.length > g.base) g.base = prev.base + prev.names.length;
    }
  });
  const lines = Math.max(1, ...groups.map((g) => g.base + g.names.length));
  const top = 10 + lines * LINE_H;
  const h = top + ROW_H * 2;
  /** Baseline of label line k, counting up from the line nearest the timeline. */
  const lineY = (k: number) => top - 10 - k * LINE_H;

  const row = (m: RunMarks, y: number, cls: string, label: string) => (
    <g className={cls}>
      <text x={0} y={y + 4} className="timeline__row">{label}</text>
      <line x1={x(0)} x2={x(m.end)} y1={y} y2={y} />
      {[0, ...m.ticks, m.end].map((t, i) => t !== null && <line key={i} x1={x(t)} x2={x(t)} y1={y - 4} y2={y + 4} />)}
    </g>
  );

  return (
    <svg ref={ref} className="timeline" width="100%" height={h} role="img" aria-label={`${currentLabel} and ${otherLabel} timelines`}>
      {groups.map((g) => (
        <g key={g.t}>
          {g.base > 0 && <line className="timeline__leader" x1={x(g.t)} x2={x(g.t)} y1={lineY(g.base - 1) - 2} y2={top - 5} />}
          <text className="timeline__phase" textAnchor="middle">
            {g.names.map((n, i) => (
              <tspan key={n} x={x(g.t)} y={lineY(g.base + g.names.length - 1 - i)}>{n}</tspan>
            ))}
          </text>
        </g>
      ))}
      {row(current, top, "timeline__current", currentLabel)}
      {row(other, top + ROW_H, "timeline__other", otherLabel)}
      <line className="timeline__now" x1={x(Math.min(now, current.end))} x2={x(Math.min(now, current.end))} y1={top - 7} y2={top + 7} />
    </svg>
  );
}

// The headline comparison: the ambulance's journey time without and with the system, as two bars on one
// real-time scale, so their lengths compare directly. Each bar is labelled at its end with its time and
// carries a tick where the ambulance passed J1 and J2. The run on screen fills as it plays, with a blue
// dot for the ambulance; the other run stays a faint track.
import { useEffect, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { useExplain, type Tip } from "./Explain";
import type { RunMarks } from "./runMarks";

export function formatMinSec(s: number): string {
  const v = Math.round(Math.abs(s));
  const m = Math.floor(v / 60);
  return m > 0 ? `${m} min ${v % 60} s` : `${v} s`;
}

/** Drawn in CSS pixels at the box's measured width, so type stays at the panel's size. */
const LABEL_W = 64;
const END_W = 78;
const ROW_GAP = 34;
const TOP = 24;
/** Below this tick spacing (px) the J1 and J2 labels would overlap if centred. */
const LABEL_GAP = 22;

function useWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function RunChart({ without, withSystem, system, now, tips }: {
  without: RunMarks;
  withSystem: RunMarks;
  /** Which run is on screen. */
  system: boolean;
  /** Seconds since entry on the run on screen. */
  now: number;
  /** Hover notes for the two bars. */
  tips?: { without: Tip; withSystem: Tip };
}) {
  const [ref, W] = useWidth();
  const hover = [useExplain(tips?.without ?? null), useExplain(tips?.withSystem ?? null)];
  const x = scaleLinear().domain([0, Math.max(without.end, withSystem.end)]).range([LABEL_W, W - END_W]);
  const rows = [
    { name: "Without", marks: without, current: !system, y: TOP },
    { name: "With", marks: withSystem, current: system, y: TOP + ROW_GAP },
  ];
  const h = TOP + ROW_GAP + 24;

  return (
    <svg ref={ref} className="run" width="100%" height={h} role="img"
      aria-label={`Journey time: ${formatMinSec(without.end)} without the system, ${formatMinSec(withSystem.end)} with it.`}>
      {rows.map(({ name, marks, current, y }, i) => {
        const head = x(Math.max(0, Math.min(now, marks.end)));
        // J1 labels sit above the top bar and below the bottom one, so they never meet.
        const labelY = i === 0 ? y - 11 : y + 19;
        const passed = [
          { id: "J1", t: marks.ticks[1], anchor: "middle" as const, nudge: 0 },
          { id: "J2", t: marks.ticks[3], anchor: "middle" as const, nudge: 0 },
        ];
        // Ticks closer than a label's width: push the two labels apart, away from each other.
        if (passed[0].t !== null && passed[1].t !== null && x(passed[1].t) - x(passed[0].t) < LABEL_GAP) {
          Object.assign(passed[0], { anchor: "end", nudge: -2 });
          Object.assign(passed[1], { anchor: "start", nudge: 2 });
        }
        return (
          <g key={name} className={current ? "run__row run__row--current" : "run__row"} {...hover[i]}>
            {/* Invisible band over the row, so the whole bar answers to the pointer, not only its thin lines. */}
            <rect x={0} y={y - 14} width={W} height={28} fill="transparent" />
            <text className="run__name" x={0} y={y + 4}>{name}</text>
            <rect className="run__track" x={x(0)} y={y - 2} width={x(marks.end) - x(0)} height={4} rx={2} />
            {current && <rect className="run__fill" x={x(0)} y={y - 2} width={head - x(0)} height={4} rx={2} />}
            {passed.map(({ id, t, anchor, nudge }) => t !== null && (
              <g key={id}>
                <line className="run__tick" x1={x(t)} x2={x(t)} y1={y - 6} y2={y + 6} />
                <text className="run__junction" x={x(t) + nudge} y={labelY} textAnchor={anchor}>{id}</text>
              </g>
            ))}
            <text className="run__end" x={x(marks.end) + 10} y={y + 4}>{formatMinSec(marks.end)}</text>
            {current && <circle className="run__head" cx={head} cy={y} r={5} />}
          </g>
        );
      })}
    </svg>
  );
}

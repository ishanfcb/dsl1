// The Sources sheet: a glass panel that slides in from the right over the visual, the full height of the map,
// with the rest of the page dimmed behind it. While it is open it has all the attention: time is held (see
// CorridorPage), focus stays inside, and a click on the dimmed page or Esc closes it. Lists the numbers the
// current scenario runs on, each with its kind, source link and note, then every source and what we took from
// it. Reads scenarios.json and DATA_SOURCES.md only; holds no numbers of its own.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { DataNode } from "../components/DataBadge";
import { KIND_HINT, KIND_LABEL } from "../components/sourceSheet";
import { formatValue, linesFor } from "../components/sheetLines";
import { SOURCES, type Source } from "../components/sources";

type Kind = DataNode["kind"];
type Filter = Kind | "all";
const KINDS: Kind[] = ["sourced", "derived", "proxy", "assumption"];

function SourceLink({ source }: { source: Source }) {
  return source.url ? (
    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
  ) : (
    <>{source.title}</>
  );
}

/** Keeps Tab and Shift+Tab inside the sheet. */
function trapTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const items = e.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function SourcesSheet({ open, onClose, scenarioId, place, reducedMotion }: {
  open: boolean;
  onClose(): void;
  scenarioId: string;
  place: string;
  reducedMotion: boolean;
}) {
  const groups = useMemo(() => linesFor(scenarioId), [scenarioId]);
  const [filter, setFilter] = useState<Filter>("all");
  const close = useRef<HTMLButtonElement>(null);
  // Focus moves into the sheet on open and goes back to whatever opened it (the Sources toggle) on close.
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, [open]);

  const all = groups.flatMap((g) => g.lines);
  const count = (k: Kind) => all.filter((l) => l.node.kind === k).length;
  const usedFor = new Map<string, string[]>();
  for (const l of all) if (l.node.src) usedFor.set(l.node.src, [...(usedFor.get(l.node.src) ?? []), l.row.label]);

  const ease = [0.22, 1, 0.36, 1] as const;
  const slide = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : { initial: { x: "104%" }, animate: { x: 0 }, exit: { x: "104%" }, transition: { type: "tween" as const, duration: 0.5, ease } };
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: reducedMotion ? 0 : 0.3 } };

  return createPortal(
    <AnimatePresence>
      {open && <motion.div key="scrim" className="sheet-scrim" aria-hidden="true" onClick={onClose} {...fade} />}
      {open && (
        <motion.aside
          key="sheet"
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onKeyDown={trapTab}
          {...slide}
        >
          <header className="sheet__head">
            <div>
              <p className="sheet__eyebrow">{place}</p>
              <h2 id="sheet-title" className="sheet__title">Sources and assumptions</h2>
            </div>
            <button ref={close} className="sheet__close" onClick={onClose} aria-label="Close sources">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="sheet__body">
            <p className="sheet__lede">
              Every number this scenario runs on, where it comes from, and whether we took it from a source, calculated it,
              borrowed it from a similar place or assumed it. Source names open the original page.
            </p>

            <div className="toggle sheet__filter" role="group" aria-label="Show">
              <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All<span className="sheet__count">{all.length}</span></button>
              {KINDS.map((k) => (
                <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} title={KIND_HINT[k]}>
                  {KIND_LABEL[k]}<span className="sheet__count">{count(k)}</span>
                </button>
              ))}
            </div>

            {groups.map((g) => {
              const lines = g.lines.filter((l) => filter === "all" || l.node.kind === filter);
              if (lines.length === 0) return null;
              return (
                <section key={g.title} className="sheet__group">
                  <h3 className="sheet__heading">{g.title}</h3>
                  <ul className="sheet__list">
                    {lines.map((l) => {
                      const source = l.node.src ? SOURCES[l.node.src] : undefined;
                      return (
                        <li key={l.row.path} className="sheet__item">
                          <div className="sheet__line">
                            <span className="sheet__label">{l.row.label}</span>
                            <span className="sheet__value">{formatValue(l)}</span>
                          </div>
                          <div className="sheet__meta">
                            <span className={`sheet__kind sheet__kind--${l.node.kind}`}>{KIND_LABEL[l.node.kind]}</span>
                            {source && <span>{source.id} · <SourceLink source={source} /></span>}
                          </div>
                          {(l.node.how ?? l.node.note) && <p className="sheet__how">{l.node.how ?? l.node.note}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <section className="sheet__group">
              <h3 className="sheet__heading">All sources</h3>
              <ul className="sheet__list">
                {Object.values(SOURCES).map((s) => (
                  <li key={s.id} className="sheet__item">
                    <div className="sheet__source"><span className="sheet__id">{s.id}</span><SourceLink source={s} /></div>
                    <p className="sheet__what">{s.what}</p>
                    {usedFor.has(s.id) && <p className="sheet__note">Used here for: {usedFor.get(s.id)!.join(", ")}.</p>}
                    {s.note && <p className="sheet__note">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}

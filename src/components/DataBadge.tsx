// A number from scenarios.json with its source id; proxy and assumption values get a hollow dot (CLAUDE.md §2).
// Hovering it explains the number in plain words, links its source and says what kind of number it is.
import type { ReactNode } from "react";
import { Explain } from "./Explain";
import { SOURCES } from "./sources";

export interface DataNode {
  value: number;
  src?: string;
  kind: "sourced" | "derived" | "proxy" | "assumption";
  note?: string;
  /** Plain-English account of how the number was found or worked out (the Sources sheet shows it). */
  how?: string;
}

export const KIND_TEXT: Record<DataNode["kind"], string> = {
  sourced: "Taken directly from the source.",
  derived: "Worked out from sourced numbers.",
  proxy: "Proxy: real data from a similar place.",
  assumption: "Assumption: no public data found.",
};

export function DataBadge({ node, unit, digits = 1, explain }: {
  node: DataNode;
  unit: string;
  digits?: number;
  /** What this number means, in one plain sentence. */
  explain?: ReactNode;
}) {
  const flagged = node.kind === "proxy" || node.kind === "assumption";
  const source = node.src ? SOURCES[node.src] : undefined;
  const meta = (
    <>
      {source && (
        <div>
          {`${source.id} · `}
          {source.url ? (
            <a className="tip__src" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
          ) : (
            source.title
          )}
        </div>
      )}
      {source?.note && <div className="tip__note">{source.note}</div>}
      <div>{KIND_TEXT[node.kind]}</div>
      {flagged && (node.how ?? node.note) && <div className="tip__note">{node.how ?? node.note}</div>}
    </>
  );
  return (
    <Explain className="badge" tip={{ body: explain ?? source?.what ?? KIND_TEXT[node.kind], meta }}>
      {node.value.toFixed(digits)} {unit}
      {node.src && <span className="badge__src"> · {node.src}</span>}
      {flagged && <span className="badge__mark" role="img" aria-label={node.kind} />}
    </Explain>
  );
}

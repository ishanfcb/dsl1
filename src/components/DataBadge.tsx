// A number from scenarios.json with its source id; proxy and assumption values get a hollow dot
// whose tooltip says what kind of number it is and why (CLAUDE.md §2).
export interface DataNode {
  value: number;
  src?: string;
  kind: "sourced" | "derived" | "proxy" | "assumption";
  note?: string;
}

const KIND_TEXT = { proxy: "Proxy: real data from a similar place.", assumption: "Assumption: no public data found." } as const;

export function DataBadge({ node, unit, digits = 1 }: { node: DataNode; unit: string; digits?: number }) {
  const flagged = node.kind === "proxy" || node.kind === "assumption";
  return (
    <span className="badge">
      {node.value.toFixed(digits)} {unit}
      {node.src && <span className="badge__src"> · {node.src}</span>}
      {flagged && (
        <span
          className="badge__mark"
          role="img"
          aria-label={node.kind}
          title={[KIND_TEXT[node.kind as keyof typeof KIND_TEXT], node.note].filter(Boolean).join(" ")}
        />
      )}
    </span>
  );
}

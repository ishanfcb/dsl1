// The rows of the Sources sheet for one scenario: each row of SHEET_GROUPS resolved against scenarios.json.
// Pure TS so it can be tested; the sheet itself only draws what this returns.
import data from "../../data/scenarios.json";
import { deref, scenarioById, type Lookup } from "../engine/data";
import type { DataNode } from "./DataBadge";
import { SHEET_GROUPS, type SheetRow } from "./sourceSheet";

export interface Line {
  row: SheetRow;
  node: DataNode;
}

/** Like the engine's `at`, but follows refs at every step and returns undefined for a path the scenario lacks. */
function resolve(ctx: Lookup, path: string): unknown {
  const parts = path.split(".");
  let node: unknown = parts[0] === "global" || parts[0] === "scaling" ? ctx.root : ctx.scenario;
  try {
    for (const p of parts) {
      node = deref(ctx, node);
      if (node === null || typeof node !== "object" || !(p in node)) return undefined;
      node = (node as Record<string, unknown>)[p];
    }
    return deref(ctx, node);
  } catch {
    return undefined;
  }
}

function isDataNode(n: unknown): n is DataNode {
  return typeof n === "object" && n !== null && typeof (n as DataNode).value === "number" && typeof (n as DataNode).kind === "string";
}

export function linesFor(scenarioId: string) {
  const root = data as unknown as Record<string, unknown>;
  const ctx: Lookup = { root, scenario: scenarioById(root, scenarioId) };
  const seen = new Map<unknown, Line>();
  return SHEET_GROUPS.map((g) => ({
    title: g.title,
    lines: g.rows.flatMap((row): Line[] => {
      const node = resolve(ctx, row.path);
      if (!isDataNode(node)) return [];
      const earlier = seen.get(node);
      if (earlier) {
        if (earlier.row.shared) earlier.row = { ...earlier.row, label: earlier.row.shared };
        return [];
      }
      const line = { row, node };
      seen.set(node, line);
      return [line];
    }),
  })).filter((g) => g.lines.length > 0);
}

export function formatValue({ row, node }: Line) {
  if (row.pct) return `${+(node.value * 100).toFixed(1)}%`;
  const v = node.value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return row.unit ? (row.unit === "×" ? `${v}×` : `${v} ${row.unit}`) : v;
}

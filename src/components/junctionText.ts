// Words for junctions: names from scenarios.json, and a plain description of each state.
import type { JunctionId, JunctionState } from "../engine";

/** Junction name as the scenario gives it, without its verification notes in brackets. */
export function junctionName(scenario: { junctions?: Record<string, string> }, j: JunctionId): string {
  const raw = scenario.junctions?.[j] ?? j;
  return raw.replace(/\s*\(.*\)\s*$/, "");
}

export const STATE_TEXT: Record<JunctionState, string> = {
  NORMAL: "Normal cycle",
  PREWARN: "Prewarn — blue steady",
  ALERT: "Alert — blue blinking",
  CLEARED: "Cleared — resuming cycle",
};

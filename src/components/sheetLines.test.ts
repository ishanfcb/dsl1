import { describe, expect, test } from "vitest";
import { linesFor } from "./sheetLines";

// The two cities the page can show (src/views/useScenario.ts CITIES).
const SHOWN = ["gurugram-monday-peak", "bengaluru-heavy-rain"];

describe("Sources sheet", () => {
  test.each(SHOWN)("every number shown for %s says how it was found or worked out", (id) => {
    const lines = linesFor(id).flatMap((g) => g.lines);
    expect(lines.length).toBeGreaterThan(30);
    const missing = lines.filter((l) => !l.node.how).map((l) => l.row.path);
    expect(missing).toEqual([]);
  });

  test("a calculated number's explanation names the inputs it was worked out from", () => {
    for (const id of SHOWN) {
      for (const l of linesFor(id).flatMap((g) => g.lines)) {
        if (l.node.kind === "derived") expect(l.node.how, l.row.path).toMatch(/\d.*[=×÷−+]|S\d+/);
      }
    }
  });
});

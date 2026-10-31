// Reading scenarios.json: ref resolution and typed value access. No numbers live here.

type Node = Record<string, unknown>;

export interface Lookup {
  root: Node;
  scenario: Node;
}

export function scenarioById(root: Node, id: string): Node {
  const list = root.scenarios as Node[];
  const found = list.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown scenario "${id}"`);
  return found;
}

/** Paths starting "global." / "scaling." are from the root, "scenarios.<id>." from that scenario, anything else relative to the current scenario. */
export function at(ctx: Lookup, path: string): unknown {
  const parts = path.split(".");
  let node: unknown;
  let c = ctx;
  if (parts[0] === "global" || parts[0] === "scaling") {
    node = ctx.root;
  } else if (parts[0] === "scenarios") {
    node = scenarioById(ctx.root, parts[1]);
    c = { root: ctx.root, scenario: node as Node };
    parts.splice(0, 2);
  } else {
    node = ctx.scenario;
  }
  for (const p of parts) {
    if (node === null || typeof node !== "object" || !(p in node)) {
      throw new Error(`scenarios.json: missing "${path}" (at "${p}")`);
    }
    node = (node as Node)[p];
  }
  return deref(c, node);
}

/** Follows {ref} nodes. A scenario path inside a ref resolves against the scenario it names. */
export function deref(ctx: Lookup, node: unknown): unknown {
  let current = node;
  let c = ctx;
  for (let hops = 0; isRef(current); hops++) {
    if (hops > 8) throw new Error("scenarios.json: ref loop");
    const path = current.ref;
    const parts = path.split(".");
    if (parts[0] === "scenarios") c = { root: ctx.root, scenario: scenarioById(ctx.root, parts[1]) };
    current = at(c, path);
  }
  return current;
}

function isRef(node: unknown): node is { ref: string } {
  return typeof node === "object" && node !== null && typeof (node as Node).ref === "string";
}

export function num(ctx: Lookup, pathOrNode: string | unknown): number {
  const node = typeof pathOrNode === "string" ? at(ctx, pathOrNode) : deref(ctx, pathOrNode);
  const value = (node as Node | null)?.value;
  if (typeof value !== "number") throw new Error(`scenarios.json: expected a numeric value at ${describe(pathOrNode)}`);
  return value;
}

export function pair(ctx: Lookup, pathOrNode: string | unknown): [number, number] {
  const node = typeof pathOrNode === "string" ? at(ctx, pathOrNode) : deref(ctx, pathOrNode);
  const value = (node as Node | null)?.value;
  if (!Array.isArray(value) || value.length !== 2) throw new Error(`scenarios.json: expected [a, b] at ${describe(pathOrNode)}`);
  return [value[0] as number, value[1] as number];
}

export function obj(ctx: Lookup, path: string): Node {
  const node = at(ctx, path);
  if (node === null || typeof node !== "object") throw new Error(`scenarios.json: expected an object at "${path}"`);
  return node as Node;
}

function describe(p: unknown): string {
  return typeof p === "string" ? `"${p}"` : JSON.stringify(p);
}

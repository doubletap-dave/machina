# Machina Lane 1a — Compiler

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `packages/graph/**` only. Read `@machina/core`, `@machina/node-sdk`, `@machina/plugin-core`, `@machina/ui`. Do not modify them.
>
> Parent: `docs/superpowers/plans/2026-08-24-machina.md` (Global Constraints + Frozen contracts).

**Goal:** Compile a `MachinaProject` into a `SimulationPlan` or English `MachinaError[]`.

**Architecture:** Load registry, resolve nested graphs (flatten portal nodes into the plan with wires on the parent), typecheck every edge with `matchPorts`, require exactly one `control.clock` reachable from `entryGraphId`.

**Tech Stack:** TypeScript, Vitest, `@machina/core`, `@machina/node-sdk`, `@machina/plugin-core`, `@machina/ui`.

---

### Task 1: compile() happy path + missing clock

**Files:**
- Modify: `packages/graph/package.json` (add deps `@machina/core`, `@machina/node-sdk`, `@machina/plugin-core`, `@machina/ui`, vitest; `"test": "vitest run"`)
- Create: `packages/graph/src/compile.ts`, `packages/graph/src/index.ts`, `packages/graph/tests/compile.test.ts`, `packages/graph/tsconfig.json`

**Interfaces:**
- Consumes: `MachinaProject`, `SimulationPlan`, `matchPorts`, `createRegistry`, `registerCoreKinds`, `missingClockCopy`, `unknownKindCopy`, `versionMismatchCopy`
- Produces: `export function compile(project: MachinaProject, registry: NodeRegistry): { plan: SimulationPlan } | { errors: MachinaError[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { compile } from "../src/index.ts";
import type { MachinaProject } from "@machina/core";

function registry() {
  const r = createRegistry();
  registerCoreKinds(r);
  return r;
}

const empty: MachinaProject = {
  schemaVersion: 1,
  id: "p",
  name: "Empty",
  entryGraphId: "g",
  presetRefs: [],
  graphs: [{ id: "g", nodes: [], edges: [] }],
};

describe("compile", () => {
  it("fails without a Clock", () => {
    const result = compile(empty, registry());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("This world needs a Clock before it can run.");
    }
  });
});
```

- [ ] **Step 2: Run `pnpm --filter @machina/graph test` — FAIL**

- [ ] **Step 3: Implement `compile`**

If the entry graph (and subgraphs) contain zero nodes with `kind === "control.clock"`, return `{ errors: [{ code: "MISSING_CLOCK", message: missingClockCopy() }] }`. If one clock exists and no edges, return a plan:

```ts
{
  projectId: project.id,
  clock: { nodeId: clock.id, config: clock.config },
  systems: [],
  agents: [],
  perception: [],
  analysis: [],
}
```

Classify other nodes later in Task 2; for this task only clock vs missing clock.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat: compile rejects worlds with no Clock`

---

### Task 2: unknown kind, version mismatch, port typecheck, classification

**Files:**
- Modify: `packages/graph/src/compile.ts`
- Test: `packages/graph/tests/compile-edges.test.ts`

**Interfaces:**
- Consumes: `matchPorts`, node `ports` from registry
- Produces: same `compile`; on success fills `systems`, `agents`, `perception`, `analysis` from `runtime` field (`mechanical`/`actor` → systems except perception kind; `perception.perception` → perception; `agent` → agents with `graphRef: \`agent:${nodeId}\`` and `actorRef` from a connected `entities.actor` `ref` output or the agent node id; `none` skipped; inspector/logger → analysis)

- [ ] **Step 1: Tests**

1. Node `kind: "nope.thing"` → error message `Machina doesn't know a node called nope.thing.`
2. `kind: "cognition.agent"` `version: 99` → `This node needs an update.`
3. Edge Resource.stock → Personality.traits → error `A resource can't shape a personality. Attach it to a nation or an economy.` with `nodeId` of the personality node.
4. Fixture: clock → world; personality → actor; perception world.state → perception.state; perception.observation → agent.observation; agent.action → system.actions; two actors not required. Expect `plan.clock.nodeId`, `plan.perception.length === 1`, `plan.agents.length === 1`, `plan.agents[0].graphRef === "agent:<id>"`.

Build fixture nodes with valid kinds/ports from plugin-core. Include required exclusive inputs using extra nodes (clock, personality, memory, goal wired into agent and actor).

- [ ] **Step 2: FAIL then implement full compile**

Algorithm:
1. Index graphs by id. Start at `entryGraphId`. Recurse into `subgraphId` graphs (do not duplicate clock requirement per subgraph — clock must exist on the entry graph).
2. For each node, `registry.get(kind, version)` → unknown / mismatch errors.
3. For each edge, resolve source/target port defs; `matchPorts`; collect errors. Also: exclusive inbound ports with two edges → `{ code: "EXCLUSIVE_PORT", message: "This input already has a connection.", nodeId, port }`.
4. If any errors, return `{ errors }` (do not return a plan).
5. Else build `SimulationPlan`. `stripPositions` is not required here (runtime ignores position). `packetWires` for agents = inbound wires of type OBSERVATION, MEMORY, GOAL, PERSONALITY.

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit** `feat: typecheck edges and emit SimulationPlan`

---

Lane 1a done when `pnpm --filter @machina/graph test` is green and `compile` is exported from `@machina/graph`.

# Studio and engine complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio is a React Flow editor; every core kind is configurable; Watch/God/Possess work; theme, dots, snap, and MiniMap work; the kernel Thinks with Goal/Personality/Memory from the graph.

**Architecture:** React Flow owns the live canvas (`useNodesState` / `useEdgesState`). `GraphDocument` is the compile/save projection. Compiler resolves packet wires into `SimulationPlan.agents[].packet`. `createKernelFromPlan` copies that onto `ObservationPacket`. Studio chrome is a fixed grid; Configure holds models and appearance; header holds stances.

**Tech Stack:** TypeScript, Vitest, React 19, Next.js 16, `@xyflow/react` 12, Zod 3, existing `@machina/*` packages.

**Spec:** `docs/superpowers/specs/2026-08-25-studio-and-engine-complete-design.md`

## Global Constraints

- IR-first for **runtime**. Positions never enter the kernel. `stripPositions` before compile.
- `@machina/agents` never imports `@machina/simulation` or `TrueWorldState`.
- No `if (project.name === "dead-channel")`.
- No new `PortType`. Port **colors** stay the frozen hex table. Themes must not recolor ports.
- English errors only. New copy is verbatim from the spec.
- TDD: failing test → minimal code → refactor. Engine tests: no network, no real LLM.
- Think is a real model in shipped Run/CLI. Tests may inject `ThinkFn`.
- Target ~200 LOC per file; split before growing.
- Conventional commits. `pnpm test` before claiming the lane done.
- PowerShell: no `&&`. Chain with `;`. From repo root: `C:\Users\axolatl-tank\Projects\machina`.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/core/src/kind-english.ts` | `actorNeedsNameCopy`, `goalHasNoStatementCopy` |
| `packages/core/src/god-view.ts` | `GodView` type (Studio/client; not simulation internals) |
| `packages/core/src/plan.ts` | `AgentPacket` + `packet` on agents; `config`/`wires` on analysis |
| `packages/core/src/instrument.ts` | additive `{ type: "log"; record: "event" \| "action"; turn: number; payload: unknown }` |
| `packages/node-sdk/src/define-node.ts` | `fields: KindField[]` on `NodeDefinition` |
| `packages/node-sdk/src/from-manifest.ts` | copy `manifest.fields` onto the definition |
| `plugins/core/src/kinds/*.ts` + `schemas.ts` | Zod, `fields`, port `label` nouns |
| `packages/graph/src/validate.ts` | actor name / goal statement |
| `packages/graph/src/classify.ts` | `resolveAgentPacket`, analysis config+wires |
| `packages/simulation/src/from-plan.ts` + `kernel.ts` | feed packet, names, fog, logger |
| `packages/engine/src/engine.ts` | `getGodView()` on `EngineRun` |
| `apps/runtime/src/app.ts` | `GET /runs/:id/truth` |
| `packages/client/src/client.ts` | `getTruth(runId)` |
| `apps/studio/src/components/Inspector.tsx` | one form from `def.fields` |
| `packages/ui/src/port-language.ts` | geometric `PortSymbolId` |
| `apps/studio/src/canvas/port-symbol.tsx` | shape primitives |
| `packages/ui/src/themes.ts` + `globals.css` | `--machina-grid-dot` |
| `apps/studio/src/components/StudioShell.tsx` | chrome grid, header stances, Configure appearance |
| `apps/studio/src/canvas/dnd.ts` | HTML5 library drop |
| `apps/studio/src/canvas/flow-sync.ts` | RF ↔ `GraphDocument` |
| `apps/studio/src/components/Canvas.tsx` | `useNodesState`, snap, dots, MiniMap, reconnect |
| `docs/reports/lane-studio-and-engine-complete.md` | evidence |
| `AGENTS.md` | status + Next 16 already noted |

---

### Task 1: Frozen copies, GodView, plan packet, log instrument

**Files:**
- Modify: `packages/core/src/kind-english.ts`
- Create: `packages/core/src/god-view.ts`
- Modify: `packages/core/src/plan.ts`
- Modify: `packages/core/src/instrument.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/ui/src/english.ts` (re-export new copy)
- Modify: `packages/ui/src/index.ts`
- Test: `packages/core/src/kind-english.ts` — add tests in `packages/core/src/kind-hash.test.ts` or create `packages/core/src/kind-english.test.ts`
- Test: `packages/core/src/instrument.ts` — `packages/core/tests/instrument.test.ts`
- Modify: `packages/simulation/tests/from-plan.test.ts` (add `packet` so TS still typechecks after plan change)

**Interfaces:**

```ts
export function actorNeedsNameCopy(): string {
  return "This actor needs a name.";
}
export function goalHasNoStatementCopy(): string {
  return "This goal has no statement.";
}

export type GodView = {
  turn: number;
  actors: Record<string, { name: string; resources: Record<string, number> }>;
};

export type AgentPacket = {
  personality: unknown;
  goals: unknown;
  memory: unknown;
};

export const emptyAgentPacket = (): AgentPacket => ({
  personality: null,
  goals: null,
  memory: null,
});

// SimulationPlan.agents[i] gains packet: AgentPacket
// SimulationPlan.analysis[i] becomes { nodeId, kind, config: unknown, wires: Wire[] }

// InstrumentMsg gains:
// | { type: "log"; record: "event" | "action"; turn: number; payload: unknown }
```

- [ ] **Step 1: Write failing tests**

`packages/core/src/kind-english.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { actorNeedsNameCopy, goalHasNoStatementCopy } from "./kind-english.ts";

describe("kind config copy", () => {
  it("names a missing actor", () => {
    expect(actorNeedsNameCopy()).toBe("This actor needs a name.");
  });
  it("names a missing goal", () => {
    expect(goalHasNoStatementCopy()).toBe("This goal has no statement.");
  });
});
```

`packages/core/tests/instrument.test.ts` — add:

```ts
it("accepts a logger line", () => {
  const msg: InstrumentMsg = {
    type: "log",
    record: "action",
    turn: 1,
    payload: { type: "wait" },
  };
  expect(msg.type).toBe("log");
});
```

- [ ] **Step 2: Run** `pnpm --filter @machina/core test`  
  Expected: FAIL (exports missing).

- [ ] **Step 3: Implement** the functions, `GodView`, `AgentPacket`, `emptyAgentPacket`, plan fields, instrument union. Re-export copy from `@machina/ui`. Patch `from-plan.test.ts` agents with `packet: emptyAgentPacket()` (import from core). Any other `SimulationPlan` fixtures in the repo: add `packet` and analysis `config: {}`, `wires: []`. Search with Grep `packetWires:`.

- [ ] **Step 4: Run** `pnpm --filter @machina/core test` and `pnpm --filter @machina/simulation test`  
  Expected: PASS.

- [ ] **Step 5: Commit** `feat: add agent packet plan fields and config English`

---

### Task 2: Kind fields, schemas, port nouns

**Files:**
- Modify: `packages/node-sdk/src/define-node.ts` — `fields: KindField[]` (default `[]` inside `defineNode` if omitted so custom tests keep working, but core kinds pass explicit arrays)
- Modify: `packages/node-sdk/src/from-manifest.ts` — `fields: manifest.fields`
- Modify: `packages/node-sdk/src/from-manifest.test.ts` — `expect(got.fields).toEqual(radioDesk.fields)`
- Modify: `plugins/core/src/kinds/schemas.ts`
- Modify: `plugins/core/src/kinds/control.ts`, `entities.ts`, `cognition.ts`, `perception.ts`, `systems.ts`, `analysis.ts`
- Test: `plugins/core/src/kinds/fields.test.ts` (create)

**Interfaces:** keep existing Zod names. Extend:

```ts
export const clockConfigSchema = baseConfigSchema.extend({
  period: z.enum(["turn", "day", "week", "month", "year"]).default("month"),
});
export const worldConfigSchema = baseConfigSchema.extend({
  name: z.string().default("World"),
});
export const actorConfigSchema = z.object({ name: z.string().min(1) });
export const resourceConfigSchema = baseConfigSchema.extend({
  name: z.string().default("Resource"),
  amount: z.number().default(0),
});
export const eventConfigSchema = baseConfigSchema.extend({
  name: z.string().default("Event"),
  description: z.string().default(""),
});
export const goalConfigSchema = baseConfigSchema.extend({
  statement: z.string().default("New goal"),
  priority: z.number().min(0).max(100).default(50),
});
export const memoryConfigSchema = baseConfigSchema.extend({
  seed: z.string().default(""),
});
export const perceptionConfigSchema = baseConfigSchema.extend({
  fog: z.number().min(0).max(100).default(50),
});
export const relationshipConfigSchema = baseConfigSchema.extend({
  stance: z.number().min(0).max(100).default(50),
});
export const inspectorConfigSchema = baseConfigSchema.extend({
  title: z.string().default("Inspector"),
});
export const loggerConfigSchema = baseConfigSchema.extend({
  record: z.enum(["events", "actions", "both"]).default("both"),
});
```

Personality and agent schemas stay. System `mechanic` stays.

Port `label` on every core port (exact spec nouns):

| kind.port | label |
|-----------|--------|
| clock.tick, world.tick, actor.tick, system.tick | Tick |
| world.state, perception.state, inspector.state | State |
| actor.state | State |
| actor.personality, personality.traits, agent.personality | Personality |
| actor.goals, goal.goals, agent.goals | Goals |
| actor.memory, memory.memory, agent.memory | Memory |
| actor.ref, system.actors, relationship.actors | Actor |
| perception.observation, agent.observation | Observation |
| agent.action, system.actions | Action |
| agent.message | Message |
| event.events, memory.events, logger.events, system.events, relationship.events | Events |
| resource.stock, system.resources | Stock |
| relationship.relationship | Stance |
| system.state | State |

`fields` on each `defineNode` — Clock example:

```ts
fields: [
  {
    key: "period",
    label: "Period",
    type: "enum",
    options: ["turn", "day", "week", "month", "year"],
    default: "month",
  },
],
```

Actor: `{ key: "name", label: "Name", type: "string" }` (no default — required). Goal: statement string + priority number. Logger: record enum `events` \| `actions` \| `both`. Match spec §6.2 for the rest.

- [ ] **Step 1: Write** `plugins/core/src/kinds/fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "../index.ts";

it("every core kind has inspector fields", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  for (const def of registry.list()) {
    expect(def.fields.length, def.type).toBeGreaterThan(0);
  }
});

it("clock tick is labeled Tick", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  expect(registry.getOrThrow("control.clock", 1).ports.tick.label).toBe("Tick");
});

it("goal statement defaults so the Inspector can open", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  expect(registry.getOrThrow("cognition.goal", 1).configSchema.parse({})).toEqual({
    statement: "New goal",
    priority: 50,
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @machina/plugin-core test`  
  Expected: FAIL (`fields` undefined).

- [ ] **Step 3: Implement** `defineNode` to `Object.freeze` fields array default `[]`. Set `fields` on every core kind. Fix `kindManifestToDefinition` to pass `fields`. Fix engine/runtime tests that construct ports with old labels (`when time moves` → `Tick`) — Grep `when time moves`.

- [ ] **Step 4: Run** `pnpm --filter @machina/plugin-core test`; `pnpm --filter @machina/node-sdk test`; `pnpm --filter @machina/engine test`  
  Expected: PASS.

- [ ] **Step 5: Commit** `feat: add inspector fields and noun port labels to core kinds`

---

### Task 3: Compile rejects empty actor/goal; resolve agent packet

**Files:**
- Modify: `packages/graph/src/validate.ts`
- Modify: `packages/graph/src/classify.ts`
- Test: `packages/graph/tests/compile.test.ts` (extend)
- Create: `packages/graph/src/resolve-packet.ts` if classify would exceed ~200 LOC

**Interfaces:**

```ts
export function resolveAgentPacket(
  agentId: string,
  ctx: { nodesById: Map<string, MachinaNode>; edges: MachinaEdge[] },
): AgentPacket
```

Walk inbound edges to the agent (and to the actor that `findActorRef` returns). If source kind is `cognition.personality`, set `personality` to that node's `config`. If `cognition.goal`, collect configs into an array (one goal → that object; several → array). If `cognition.memory`, set `memory` to config. Unwired: `null`.

`validateFlatGraph`: after kind/edge checks, for each `entities.actor` if `String((config as {name?: string}).name ?? "").trim() === ""` push `{ code: "ACTOR_NAME", message: actorNeedsNameCopy(), nodeId }`. For each `cognition.goal` if statement blank: `{ code: "GOAL_STATEMENT", message: goalHasNoStatementCopy(), nodeId }`.

`buildSimulationPlan` agent push includes `packet: resolveAgentPacket(...)`. Analysis push includes `config: node.config`, `wires: inboundWires(node.id)`.

- [ ] **Step 1: Failing tests** in `packages/graph/tests/compile.test.ts`:

Clock-only plan still works (agents `[]`).

Project with clock + actor `{ config: { name: "" } }` → error message `This actor needs a name.`

Project with clock + goal `{ config: { statement: "" } }` → `This goal has no statement.` Whitespace-only statement also fails. Graph validate, not Zod `min(1)`.

Project: clock, actor `name: "Ada"`, personality wired to actor, goal `statement: "Hold the canal"` wired to actor, agent wired to actor ref + those packets → `result.plan.agents[0].packet.personality` has aggression key, `packet.goals.statement === "Hold the canal"` (or array of one). Use real port names from Task 2.

- [ ] **Step 2: Run** `pnpm --filter @machina/graph test`  
  Expected: FAIL.

- [ ] **Step 3: Implement** validate + resolve.

- [ ] **Step 4: Re-run graph tests.** PASS.

- [ ] **Step 5: Commit** `feat: compile agent packets and require actor name and goal statement`

---

### Task 4: Kernel uses the plan

**Files:**
- Modify: `packages/simulation/src/from-plan.ts`
- Modify: `packages/simulation/src/kernel.ts`
- Modify: `packages/simulation/src/types.ts` if kernel opts grow
- Test: `packages/simulation/tests/from-plan.test.ts`
- Test: `packages/simulation/tests/kernel.test.ts`

**Interfaces:**

```ts
export function createKernelFromPlan(
  plan: SimulationPlan,
  opts: { seed: number; think: ThinkFn; onInstrument?: (msg: InstrumentMsg) => void },
): Kernel
```

Implementation: derive `actorIds` as today. For each actor id, `name` from matching `plan.systems` entry `kind === "entities.actor"` with `nodeId === actorId` (actor nodes are bucketed as systems) `config.name`, else `actorId`.

`buildPacket`: set `personality`/`goals`/`memory` from `plan.agents.find(a => a.actorRef === actorId)?.packet`. Perception: if `plan.perception[0]?.config` has `fog` number, scale observation noise by `fog/50` (50 = current ±7). Logger: after each action event, if any analysis kind `analysis.logger` has `record` `actions` or `both`, `onInstrument({ type: "log", record: "action", turn, payload: action })`. After tick/event, if `events` or `both`, emit `record: "event"`.

- [ ] **Step 1: Failing test** in `from-plan.test.ts`:

```ts
it("puts wired personality on the think packet", async () => {
  const wired: SimulationPlan = {
    ...plan,
    agents: [
      {
        nodeId: "agent-a",
        actorRef: "a",
        graphRef: "g1",
        packetWires: [],
        packet: {
          personality: { aggression: 80, paranoia: 10, cooperation: 50, risk: 50 },
          goals: { statement: "Hold the canal", priority: 90 },
          memory: { seed: "Last winter was hard." },
        },
      },
    ],
    systems: [
      {
        nodeId: "a",
        kind: "entities.actor",
        config: { name: "Ada" },
        wires: [],
      },
    ],
    analysis: [
      {
        nodeId: "log",
        kind: "analysis.logger",
        config: { record: "actions" },
        wires: [],
      },
    ],
  };
  const logs: InstrumentMsg[] = [];
  const kernel = createKernelFromPlan(wired, {
    seed: 1,
    onInstrument: (msg) => logs.push(msg),
    think: async ({ packet }) => {
      expect(packet.personality).toEqual(wired.agents[0]!.packet.personality);
      expect((packet.goals as { statement: string }).statement).toBe("Hold the canal");
      expect(packet.memory).toEqual({ seed: "Last winter was hard." });
      return { actorId: packet.actorId, type: "wait", params: {} };
    },
  });
  expect(kernel.getTruth().actors.a?.name).toBe("Ada");
  await kernel.runTurn();
  expect(logs.some((m) => m.type === "log" && m.record === "action")).toBe(true);
  expect(logs.some((m) => m.type === "log" && m.record === "event")).toBe(false);
});
```

- [ ] **Step 2: Run** `pnpm --filter @machina/simulation test`  
  Expected: FAIL (packet still null / name is id).

- [ ] **Step 3: Implement** kernel + from-plan. Keep `TrueWorldState` internal.

- [ ] **Step 4: PASS simulation tests.** Existing packet tests still must not expose a `truth` field.

- [ ] **Step 5: Commit** `feat: feed compiled packets names and logger into the kernel`

---

### Task 5: GET truth for God

**Files:**
- Modify: `packages/engine/src/engine.ts` — `EngineRun.getGodView(): GodView | null` (`null` if stance is not `god`)
- Modify: `apps/runtime/src/app.ts` — if `method === "GET" && parsed.action === "truth"`: if `getGodView()` is null, 403 `{ message: "God stance sees truth." }`; else 200 the view
- Modify: `packages/client/src/client.ts` — `getTruth(runId: string): Promise<GodView>`
- Test: `apps/runtime/tests/http.test.ts`
- Test: `packages/client/tests/client.test.ts` — `getTruth` 403 then 200 after god stance

**Copy for 403:** `God stance sees truth.`

- [ ] **Step 1: Failing runtime test:** start run default watch; `GET /runs/:id/truth` → 403. `POST stance god`; GET → 200 with `turn` and `actors`.

- [ ] **Step 2: Run** `pnpm --filter @machina/runtime test`  
  Expected: FAIL (404 on `/truth`).

- [ ] **Step 3: Implement** engine method + GET branch **before** the `method !== "POST"` guard (today GET only matches `action === ""`). `getGodView` maps `kernel.getTruth()` when `stance.mode === "god"`.

- [ ] **Step 4: Runtime + client tests PASS.**

- [ ] **Step 5: Commit** `feat: expose GodView on GET /runs/:id/truth`

---

### Task 6: Inspector from `def.fields`

**Files:**
- Modify: `apps/studio/src/components/Inspector.tsx`
- Modify: `apps/studio/src/components/Inspector.test.tsx`
- Modify: `apps/studio/src/lib/project-store.ts` — `defaultConfig` uses `def.configSchema.parse({})` plus actor `{ name: "Actor" }` so addNode always has a name. Goal defaults come from Zod (`New goal`).

Graph validate (Task 3) rejects blank actor name / blank goal statement. Do not use Zod `min(1)` on goal statement.

- [ ] **Step 1: Inspector test** — seed store, `addNode("control.clock")`, select it, expect combobox/select named Period (getByLabelText `/period/i`). Seed goal, expect textbox Statement. Must **not** show `No editable fields for this node yet.` for clock.

- [ ] **Step 2: Run** `pnpm --filter @machina/studio test`  
  Expected: FAIL.

- [ ] **Step 3: Rewrite Inspector:** always `def = registry.getOrThrow(...)`. Render `ManifestFields` with `def.fields`. Keep agent LLM selects **in addition** when `selected.kind === "cognition.agent"`. Delete the personality-only branch (sliders come from fields type number).

- [ ] **Step 4: Studio tests PASS** (including existing personality/agent tests — number fields still `input type="number"` unless you map 0–100 numbers to range when min/max exist. Spec sliders for personality: if `field.key` is one of aggression|paranoia|cooperation|risk, use `type="range"` min 0 max 100).

- [ ] **Step 5: Commit** `feat: generate Inspector fields from kind definitions`

---

### Task 7: Geometric port marks

**Files:**
- Modify: `packages/ui/src/port-language.ts`
- Modify: `packages/ui/src/port-language.test.ts` — `OBSERVATION` symbol `ring` not `eye`
- Modify: `apps/studio/src/canvas/port-symbol.tsx`
- Modify: `apps/studio/src/components/MachinaFlowNode.test.tsx` — `data-port-symbol="ring"`; visible text `Observation` if the test port label is updated to `Observation`. Card uses `port.label` from defs.

**Symbol map (exact):** disk, ring, triangle, plus, chevron, square, hex, diamond, bar, double-ring, wedge, square-ring, notch — as spec table.

Draw 10×10 primitives (circle, rect, polygon). `data-port-symbol={id}`.

- [ ] **Step 1: Change port-language test to expect `ring` / `disk` etc. Run** `pnpm --filter @machina/ui test`  
  Expected: FAIL.

- [ ] **Step 2: Update `PORT_LANGUAGE` symbols + hover labels (Clock, Observation, …). Update `PortSymbol`. MachinaFlowNode test: query `[data-port-symbol="ring"]`.

- [ ] **Step 3: ui + studio tests PASS.**

- [ ] **Step 4: Commit** `feat: replace port pictograms with geometric marks`

---

### Task 8: Theme, Configure appearance, chrome grid, header stances (layout)

**Files:**
- Modify: `packages/ui/src/themes.ts` — add `--machina-grid-dot` to `THEME_CSS_VARS` and defaults `#2a2a2a`
- Modify: `apps/studio/src/app/globals.css` — each theme sets `--machina-grid-dot` (low contrast)
- Modify: `apps/studio/src/components/StudioShell.tsx`
- Modify: `apps/studio/src/components/ConfigurationPage.tsx` — render `AppearanceMenu` + skip-animations checkbox (lift state: prefs already in shell; pass `prefs`, `onChange`, `skipAnimations`, `onSkipAnimations`)
- Modify: `apps/studio/src/components/ConfigurationPage.test.tsx` — expect Theme select
- Modify: `apps/studio/src/run/StanceBar.tsx` — sentence case **Watch / God / Possess**, `className` using theme tokens, used in **header**
- Modify: `apps/studio/src/components/MachinaFlowNode.tsx` — `background: var(--machina-node-fill)`, `borderColor: var(--machina-node-stroke)`, `color: var(--machina-text)`
- Modify: Library / Inspector asides: `background: var(--machina-panel-bg)`, `borderColor: var(--machina-panel-border)`
- Test: `apps/studio/src/components/StudioShell.test.tsx` — Watch/God/Possess buttons; Configure shows Theme; footer does **not** have Theme

Chrome CSS:

```tsx
<header className="flex h-12 shrink-0 items-center ...">
...
<div className="flex min-h-0 flex-1">
  <div className="flex w-56 shrink-0">{mode === "build" ? <Library /> : null}</div>
  <main className="relative min-w-0 flex-1">{mode !== "configure" ? <CanvasProvider /> : null}</main>
  <aside className="flex w-72 shrink-0 flex-col">
    {mode === "build" ? <Inspector /> : <RunPanel />}
  </aside>
</div>
```

When `mode === "configure"`, body is only `<ConfigurationPage />` but header and footer stay `h-12` / same footer. Footer: Turn/Events/Cost/Errors only (wire turn from RunPanel via lift state or leave 0 until Run — lifting `turn` from RunPanel to shell is required for footer; pass `onTurn={setTurn}`).

StanceBar moves to header; `stance` state lifts to `StudioShell` and is passed into `RunPanel`.

- [ ] **Step 1: Tests** for Theme on Configure, no Theme in footer, Watch button name `Watch`.

- [ ] **Step 2: FAIL then implement.**

- [ ] **Step 3: `pnpm --filter @machina/ui test`; `pnpm --filter @machina/studio test` PASS.

- [ ] **Step 4: Commit** `feat: move appearance to Configure and lock studio chrome`

---

### Task 9: God inspector + possess from header

**Files:**
- Modify: `apps/studio/src/components/Inspector.tsx` or create `apps/studio/src/run/GodInspector.tsx`
- Modify: `apps/studio/src/components/RunPanel.tsx` — when `stance.mode === "god" && paused`, fetch `getTruth`, show resource numbers + noticeable checkbox, `applyIntervention` via new client method if missing

Check client for `applyIntervention`. If missing, add:

```ts
async applyIntervention(
  runId: string,
  payload: { path: string; value: unknown; noticeable: boolean },
): Promise<void> {
  await this.#postJson(`/runs/${runId}/interventions`, payload);
}
```

Runtime `interventions` case today returns 200 **without** calling `engineRun.applyIntervention`. **Fix that** in this task (bug): parse body and call `run.engineRun.applyIntervention`.

Possess: header Possess with no pause → `onError("Pause a run to possess this actor.")`. With pause → `setStance("possess", legalPossessTargets(...)[0])`.

- [ ] **Step 1: Runtime test** that paused + POST interventions with `{ path, value, noticeable }` changes economy (use existing pause test pattern). Client test optional.

- [ ] **Step 2: GodInspector test** with mocked `getTruth` returning `{ turn: 1, actors: { a: { name: "Ada", resources: { economy: 50 } } } }` — spinbutton/textbox economy.

- [ ] **Step 3: Implement** applyIntervention wiring + God form + header possess guard.

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** `feat: wire God truth edits and header stances`

---

### Task 10: React Flow editor — state, DnD, dots, snap, MiniMap, reconnect

**Files:**
- Create: `apps/studio/src/canvas/flow-sync.ts`
- Create: `apps/studio/src/canvas/flow-sync.test.ts`
- Create: `apps/studio/src/canvas/dnd.ts`
- Create: `apps/studio/src/canvas/dnd.test.ts`
- Modify: `apps/studio/src/components/Canvas.tsx`
- Modify: `apps/studio/src/components/Library.tsx` — `draggable`, `onDragStart`
- Modify: `apps/studio/src/canvas/minimap.ts` if needed

**Interfaces:**

```ts
// flow-sync.ts
export function graphFromFlow(
  nodes: Node[],
  edges: Edge[],
  previous: GraphDocument,
): GraphDocument
// Keep kind/version/config/subgraphId from previous.nodes by id.
// New RF nodes must already have data.machina: MachinaNode snapshot in data, or look up store.

export function snapPosition(p: { x: number; y: number }, grid = 16): { x: number; y: number } {
  return { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid };
}

// dnd.ts
export const MACHINA_DND = "application/reactflow";
export function setDragKind(event: { dataTransfer: DataTransfer }, kind: string): void {
  event.dataTransfer.setData(MACHINA_DND, kind);
  event.dataTransfer.effectAllowed = "move";
}
export function kindFromDrop(event: { dataTransfer: DataTransfer }): string | null {
  const kind = event.dataTransfer.getData(MACHINA_DND);
  return kind.length > 0 ? kind : null;
}
```

Canvas:

```tsx
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  useReactFlow,
} from "@xyflow/react";

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onReconnect={onReconnect}
  isValidConnection={isValidConnection}
  onDrop={onDrop}
  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
  snapToGrid
  snapGrid={[16, 16]}
  connectionRadius={20}
  proOptions={{ hideAttribution: true }}
>
  <Background variant={BackgroundVariant.Dots} gap={16} color="var(--machina-grid-dot, #2a2a2a)" />
  <Controls position="bottom-left" />
  <MiniMap
    position="bottom-right"
    pannable
    zoomable
    width={200}
    height={120}
    nodeColor={() => minimapNodeFill(rootStyle())}
    maskColor={minimapMaskColor(rootStyle())}
    onNodeClick={(_, node) => store.selectNode(node.id)}
  />
</ReactFlow>
```

`onNodesChange`: `setNodes(applyNodeChanges(changes, nodes))`; then `store.replaceCurrentGraph(graphFromFlow(...))` **or** existing `setNodePosition` / selection. Prefer one write-through: add `store.writeGraph(graph: GraphDocument)` that replaces current graph nodes/edges (undo: push on drop/connect/delete, not on every pixel of drag — keep `beginDrag`/`endDrag`).

`onDrop`: `const { screenToFlowPosition } = useReactFlow(); const pos = snapPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY })); store.addNode(kind, pos);` then `setNodes`/`setEdges` from `toFlowNodes(store.getCurrentGraph()...)`.

Init: when `currentGraphId` or revision jumps from load/undo, reset RF state from document.

`isValidConnection`: keep Task’s incomplete → true.

Library kind buttons: `draggable` `onDragStart={(e) => setDragKind(e, item.kind)}`. Click still `onAddKind`.

- [ ] **Step 1: Tests** `snapPosition({ x: 20, y: 10 })` → `{ x: 16, y: 16 }`. `kindFromDrop` roundtrip. MiniMap: render Canvas with provider and expect `.react-flow__minimap` (may need to mock less). `flow-sync` roundtrip ids.

- [ ] **Step 2: FAIL, implement, PASS** `pnpm --filter @machina/studio test`.

- [ ] **Step 3: Commit** `feat: drive the canvas with React Flow state drop snap and minimap`

---

### Task 11: Starter configs, AGENTS.md, report

**Files:**
- Modify: `apps/studio/src/templates/starter.ts` — world `name: "World"`, logger `{ record: "both" }`, inspector `{ title: "Inspector" }`
- Grep example world / dead-channel-lite graphs for blank actor names; set names
- Create: `docs/reports/lane-studio-and-engine-complete.md`
- Modify: `AGENTS.md` — status row, commands if Next 16 already there, frozen exports (`GodView`, `emptyAgentPacket`, `actorNeedsNameCopy`, `goalHasNoStatementCopy`, `getTruth` on client)

- [ ] **Step 1: Compile starter** in a studio or graph test: `compile(starterProject(), registry)` ok.

- [ ] **Step 2: `pnpm test` from repo root.** Expected: all pass.

- [ ] **Step 3: Report** with TDD evidence (failing test names → commit SHAs).

- [ ] **Step 4: Commit** `docs: report studio and engine complete` and `docs: update AGENTS.md` (can be one commit `docs: record studio and engine complete`).

---

## Spec coverage (self-review)

| Spec § | Task |
|--------|------|
| 3 React Flow / DnD / validation / reconnect / dots / snap / MiniMap | 10 |
| 3.1 IR sync / undo | 10 (`writeGraph` + existing undo) |
| 4 Chrome / Configure appearance | 8 |
| 5 Port geometry + nouns | 2 (labels), 7 (marks) |
| 6 Inspector fields | 2, 6 |
| 7 Stances + GodView GET | 5, 8, 9 |
| 8 Engine packet/logger/names/fog | 3, 4 |
| 9 Theme + grid-dot | 8 |
| 10 English | 1 |
| 11 Tests | each task |
| 12 Out of scope | no Sub Flow, no new PortType |

## Type names (locked)

`GodView`, `AgentPacket`, `emptyAgentPacket`, `actorNeedsNameCopy`, `goalHasNoStatementCopy`, `getGodView`, `getTruth`, `applyIntervention`, `MACHINA_DND`, `snapPosition`, `setDragKind`, `kindFromDrop`, `graphFromFlow`.

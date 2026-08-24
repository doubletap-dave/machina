# Machina — Design Specification

Date: 2026-08-24
Status: Draft for user review (brainstorming session)

Machina is a visual simulation studio for agent-based worlds. It is not a framework you configure. You operate it: drag nodes, connect them, press Run, watch a world do things — then play god, or sit in an agent’s chair and decide.

Think Unreal Blueprint / TouchDesigner / ComfyUI / Blender Geometry Nodes, applied to artificial societies.

**Optimization target:** a non-technical operator can assemble a world from named things and sliders, run it, intervene, and possess an actor — without feeling like they are programming.

**V0 success gate:** Dead Channel Lite is built entirely inside Machina (two nations, two advisors each, fog of war, relationships, diplomacy as a System, 20 turns). The operator can Watch, God-edit at a pause, and Possess an advisor. Zero scenario-specific hacks in `packages/core`, the kernel, the compiler, or the studio. If Dead Channel Lite needs a special case in those layers, V0 failed.

---

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Product | Visual simulation studio, not a config framework |
| Kernel | Hybrid: Machina owns the world loop; LangGraph owns cognition only |
| Topology | `apps/studio` (Next.js client) + `apps/runtime` (Node service + CLI) |
| Operator | Local. No accounts, billing, or multiplayer in V0 |
| Database | PGlite (in-process Postgres). Drizzle. Schema stays real Postgres SQL |
| Projects | Hybrid: explicit Save writes a folder; PGlite autosaves drafts and stores runs |
| Architecture | IR-first. Visual graph ≠ LangGraph graph ≠ kernel graph |
| UX | If it feels like programming, it is a bug |
| Stances | Watch / God / Possess — all V0 |
| LLM presets | V0 composes existing node kinds, must compile + smoke. Inventing new kinds is V1 |
| Nation | Preset, not a core engine type |
| Proof | Dead Channel Lite, last, as integration |

Rejected: LangGraph as the world clock; Next.js monolith; browser-side engine; Docker/Postgres install as a V0 prerequisite; UI graph as source of truth.

---

## 2. Product principles

1. **The canvas is intent.** The operator never authors IR, YAML, or graphs-as-code. The editor generates IR.
2. **Compile, then run.** Invalid worlds do not start. Failures are English sentences.
3. **Truth isolation.** Agents (and Possess) receive observation packets only. True world state is unreachable from cognition by construction.
4. **God writes events.** Reality changes are intervention events in the log, not silent database edits. Rewind still works.
5. **Possess is the same slot as Think.** The kernel cannot tell a human action from a model action. Fog stays on.
6. **Presets are how worlds scale.** Nested graphs and saved templates, not 5,000-node spaghetti.
7. **Plugins extend kinds, not the engine.** New mechanics arrive as `defineNode` packages.
8. **The studio feels like a high-end tool.** Linear + Figma + Unreal + Teenage Engineering. Dark neutral canvas, Geist, small accent by type/state, command palette, keyboard. No Material, no neon soup, no giant pills.

---

## 3. Architecture

```
apps/studio          XYFlow canvas, library, inspector, modes, stances
        │  HTTP + WebSocket
        ▼
apps/runtime         compile, simulate, LangGraph, PGlite, CLI
        │
        ▼
packages/core        Scenario IR, port types, events, snapshots   ← FROZEN CONTRACT
packages/graph       Compiler: IR → SimulationPlan
packages/simulation  World kernel (clock, systems, RNG, snapshots)
packages/agents      LangGraph subgraphs, checkpoints, tokens
packages/persistence Drizzle schema, PGlite, project files
packages/node-sdk    defineNode + inspector primitives
packages/ui          Shared visual primitives for custom nodes
plugins/core         V0 node kinds
```

Data flow:

```
Visual graph  →  Scenario IR  →  Compiler  →  SimulationPlan
                                      ├─ mechanical systems → kernel
                                      └─ Agent nodes        → LangGraph subgraphs
```

Studio may keep React Flow node IDs and positions. Runtime never reads them. Layout is not world state.

Once `packages/core` and `packages/node-sdk` are frozen, compiler, kernel, agents, persistence, studio, and runtime proceed in parallel against those contracts.

---

## 4. Scenario IR

A Machina **project** is a set of **graph documents**. Nested worlds are more documents, not grouped nodes on one canvas.

### 4.1 Project

```ts
type MachinaProject = {
  schemaVersion: 1;
  id: string;
  name: string;
  entryGraphId: string;
  graphs: GraphDocument[];
  presetRefs: string[]; // project-local preset ids
};
```

On disk (explicit Save):

```
<project>/
  machina.json          // project metadata + entryGraphId
  graphs/<id>.json      // one GraphDocument each
  presets/<id>/         // project-local presets (same document shape)
  assets/
```

User library (app data directory): reusable presets copied out of projects. Built-in presets ship in `plugins/core` and are never overwritten.

### 4.2 Graph document

```ts
type GraphDocument = {
  id: string;
  parentGraphId?: string;
  parentNodeId?: string;
  nodes: MachinaNode[];
  edges: MachinaEdge[];
};
```

Double-click a container node (a node with `subgraphId`) opens the child `GraphDocument`. The parent node is a portal. Boundary ports on the child graph are promoted to the container.

### 4.3 Nodes and edges

```ts
type MachinaNode = {
  id: string;
  kind: string;          // e.g. "cognition.agent"
  version: number;       // plugin kind version
  position: { x: number; y: number }; // editor-only
  config: unknown;       // validated by the plugin Zod schema
  subgraphId?: string;
};

type MachinaEdge = {
  id: string;
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
};
```

`kind` + `version` select the plugin. Core does not interpret `config`. Position is stripped before compile.

### 4.4 Port types

Closed union. Edges require an exact match. No implicit coercion. Perception is how `WORLD_STATE` becomes `OBSERVATION`. A Transform node (V1) is the only generic way to change language; V0 does not include it.

```ts
type PortType =
  | "ACTOR_REF"
  | "WORLD_STATE"
  | "OBSERVATION"
  | "ACTION"
  | "EVENT"
  | "RESOURCE"
  | "MESSAGE"
  | "RELATIONSHIP"
  | "MEMORY"
  | "SIGNAL"
  | "CLOCK"
  | "PERSONALITY"
  | "GOAL";
```

Port cardinality is declared on the node definition: `exclusive` (one inbound) or `fan-in` / `fan-out`. EVENT and SIGNAL allow fan-out by default.

Studio labels ports with sentences (“what they see”, “what they do”). Types are not the UI. Invalid drag: “A resource can’t shape a personality. Attach it to a nation or an economy.”

### 4.5 Invariants

- Every runnable project has exactly one Clock reachable from the entry graph.
- Cycles in data edges are illegal unless a node definition opts into feedback with an explicit `delay: 1 turn` port.
- Unknown `kind` fails compile.
- Kind version mismatch fails compile with “this node needs an update”, not a crash.

---

## 5. Operator experience (non-negotiable)

The IR above is internal. The operator sees:

- A **library of named things** (Nation, Personality, Clock), never `cognition.agent`.
- An **inspector that is a form**: names, sliders, chips, short text. No JSON, no schema version, no YAML.
- **Presets that drop already-wired nested graphs.**
- **English** for every refusal.
- **Command palette** of human names (⌘K).
- **Describe** (V0 compose path): a sentence becomes a proposed graph, then a real one only if it compiles.

If a screen requires the operator to think in types, files, or graphs-as-code, it is unfinished.

---

## 6. Operator stances

RUN has three stances. All are V0. Switch mid-run.

### 6.1 Watch

Default. World runs. Click to inspect. Inspector follows the current stance’s visibility rules (Watch uses the selected actor’s packet if one is selected, otherwise a summary of events — never a god dump unless stance is God).

### 6.2 God

Sees truth. May edit only while paused (between turns, after snapshot, before the next clock). Edits become **intervention events** (`kind: "intervention"`, payload, actor-or-node target). Resume applies them through the same resolvers as any other mutation. Agents do not learn it was the operator unless the intervention is also emitted into the observation pipeline (operator checkbox: “they can notice this”).

### 6.3 Possess

V0 Possess targets:

- one Agent node, or
- **all agents this turn** (run option), or
- **all Agent descendants** of a container (click Nation → Possess this cabinet).

There is no fourth mode. Picking which single advisor inside a nation without possessing the rest is “one Agent node.”

When that agent’s Think slot fires:

1. Kernel builds the same observation packet the model would get.
2. LangGraph hits `interrupt()`.
3. Studio dims the canvas except that node. Inspector is the decision: known facts, beliefs, memory, goals, **legal actions as buttons**.
4. Operator submits an `ACTION`. Kernel resumes. Indistinguishable from a model output.

No truth panel in Possess. No private chain-of-thought display ever — model or human.

The “all agents this turn” option is how you step through every model call yourself. Multiple waiting agents in one turn queue: the operator decides one at a time; the clock does not advance until the queue is empty.

---

## 7. Compiler and SimulationPlan

On Run (and on LLM-preset smoke):

1. Load IR + plugin registry.
2. Resolve nested graphs.
3. Typecheck edges against port definitions.
4. Validate required Clock, kind versions, config schemas.
5. Emit `SimulationPlan`.

```ts
type SimulationPlan = {
  projectId: string;
  clock: { nodeId: string; config: unknown };
  systems: Array<{ nodeId: string; kind: string; config: unknown; wires: Wire[] }>;
  agents: Array<{
    nodeId: string;
    actorRef: string;
    graphRef: string; // compiled LangGraph id
    packetWires: Wire[];
  }>;
  perception: Array<{ nodeId: string; config: unknown; wires: Wire[] }>;
  analysis: Array<{ nodeId: string; kind: string }>; // logger, inspector taps
};
```

Invalid plan never starts. Message is English, pointing at the human node name.

Mechanical nodes become ordered system steps. Agent nodes become compiled LangGraph subgraphs with a checkpointer. `thread_id` = `runId + nodeId`. Subgraphs use `checkpointer: true` so agent memory is inspectable. If LangGraph’s `PostgresSaver` cannot bind to PGlite, `packages/agents` ships a thin adapter that implements the same checkpointer interface against Drizzle — the rest of Machina does not care which.

---

## 8. Turn loop

Fixed pipeline. Seeded RNG in the kernel only (`packages/simulation` RNG). No wall clock in world logic. LLM non-determinism is allowed and expected.

1. **Clock** — advance one turn.
2. **Systems** — mechanical nodes mutate truth, emit events (economy-as-System, relationships, etc.).
3. **Perception** — `WORLD_STATE` + noise → `OBSERVATION` packets per actor. This is the only cognition input.
4. **Think or Possess** — for each Agent, LangGraph invoke **or** interrupt for the operator. Parallel agents in the same phase. Structured `ACTION` / `MESSAGE` out. Token `usage_metadata` recorded.
5. **Resolve actions** — systems apply ACTION → events.
6. **Snapshot** — world projection, memories, relationship matrix, agent checkpoints. Stream instrumentation to the studio.

God interventions insert only at pause (after 6, before next 1, or a hard pause that finishes the current step first).

Truth type is not imported by `packages/agents`. Packet types live in `packages/core`. Agents depend on packets, never on truth.

---

## 9. Studio shell

One window. Canvas owns the application. Library left, inspector right, both collapsible. Geist, dark infinite canvas, subtle grid, small accents by node family.

```
MACHINA    <project name>    BUILD  RUN  ANALYZE         Watch|God|Possess    ▶
LIBRARY |                   CANVAS                                | INSPECT
        |                                                        |
--------+--------------------------------------------------------+----------
Turn 18     1x     Events 12     Cost $0.47     Errors 0
```

- **BUILD** — drag, connect, inspector forms, presets, describe.
- **RUN** — palette fades. Graph is instrumentation: node activity, edge pulses, live values. Transport: play / pause / step / speed (1x, 10x, 100x). Speed compresses mechanical waits and turn pacing; LLM calls still take wall-clock time (use mock models for fast batches). Stance control visible. Possess-wait: canvas dims except the actor; inspector is the decision.
- **ANALYZE** — tab exists in V0 so the shell is not redesigned later. V0 content: turn slider, rewind, inspect. V1: branch compare, overlays, test results.

Command palette everywhere. Keyboard: run, pause, step, save, enter nested graph, exit nested graph.

Node surfaces are small rich views (status, a few numbers, sliders already set) — not empty boxes with titles. During RUN they update. Otherwise Machina is draw.io with an inference bill.

---

## 10. Presets

### 10.1 Using

Bundled: Nation, Cabinet, Agency (and a few more as needed for Dead Channel Lite). Dragging Nation materializes a nested graph: leader, advisors, memory, economy-as-System, resources, promoted ports. Double-click to enter.

### 10.2 Making (V0, must be fast)

1. **Inside a nested graph** — “Save this as a preset.” Name, category. Done.
2. **Lasso** — “Save selection as preset.” Machina wraps dangling ports into a container.
3. **Customize a built-in** — duplicate, tweak, save as yours. Built-ins are immutable.

A preset is a named `GraphDocument` plus card metadata (name, category, optional thumbnail). Stored in the project and optionally copied to the user library. Invalid graphs cannot be saved as presets (same compiler, English errors).

### 10.3 LLM compose (V0)

Operator describes a thing. Machina proposes IR using **only registered node kinds**. Loop:

1. Describe.
2. Propose IR + preview graph.
3. **Compile gate** (same compiler as Run). On failure, English errors return to the model, up to N repairs (N = 3). Still failing: show why, save nothing.
4. **Smoke:** 1 turn. Agents may use a cheap/mock model. Illegal ACTION fails the generate.
5. Operator approves → materialize and/or save as preset. Indistinguishable from handmade presets.

**V1:** invent a new `defineNode` (schema, runtime, tests, editor) for approval. Not V0.

AI helps build the simulation. It does not replace the architecture. Generated mush that does not compile is a failed generate.

---

## 11. Node SDK and V0 palette

```ts
defineNode({
  type: "cognition.personality",
  version: 1,
  metadata: { name: "Personality", category: "Behavior", icon: "..." },
  ports: { /* name → { dir, PortType, cardinality, label } */ },
  configSchema,     // Zod — inspector is generated from this unless a custom inspector is provided
  runtime,          // kernel step, or omitted for pure config nodes
  editor,           // custom React node (optional; SDK supplies a default card)
  inspector,        // custom React inspector (optional)
});
```

V0 loads plugins from the monorepo at process start. No zip marketplace.

### V0 kinds (`plugins/core`)

| Family | Kinds |
|---|---|
| Entities | `entities.world`, `entities.actor`, `entities.resource` |
| Cognition | `cognition.agent`, `cognition.personality`, `cognition.goal`, `cognition.memory` |
| Perception | `perception.perception` |
| Systems | `systems.system` (generic mechanical), `systems.relationship` |
| Control | `control.clock`, `control.event` |
| Analysis | `analysis.inspector`, `analysis.logger` |

**Nation is a preset** (Actor + nested cabinet), not `entities.nation`. Diplomacy, trade, combat are System configs or presets until `plugins/geopolitics` (V1). Scenario Test, Transform, Router, Condition, Delay, and Threshold are V1. Perception already converts world state into observations; Dead Channel Lite must not require a generic Transform.

Each kind ships editor + inspector that look like mini applications (personality sliders, agent status + tokens, actor vitals), not labeled boxes.

---

## 12. Persistence and runtime API

### 12.1 PGlite (Drizzle)

Stores: open-project autosave blobs; `simulation_runs`; `turns`; `events` (append-only, including interventions); `world_snapshots`; `agent_checkpoints`; `model_usage`; `errors`.

Not the source of truth for authored worlds — the project folder is.

### 12.2 HTTP (runtime)

- `POST /projects/open` — path to folder
- `POST /compile`
- `POST /runs` — start
- `POST /runs/:id/pause | step | resume | reset`
- `POST /runs/:id/speed`
- `POST /runs/:id/stance` — `{ mode: "watch" | "god" | "possess", nodeId?: string }`
- `POST /runs/:id/interventions` — God (rejected if not paused)
- `POST /runs/:id/possess/action` — submit ACTION
- `POST /runs/:id/rewind` — `{ turn: number }`
- `GET /runs/:id` — summary, cost, errors

### 12.3 WebSocket

Turn progress; node activity; edge pulses (port-typed); events; token cost; possess-wait (packet + legal actions); English errors.

### 12.4 CLI

```
machina run ./examples/dead-channel-lite --turns 20
machina test
```

No UI. Same compiler and kernel. LLM keys from `.env` in the workspace (local operator, bring your own). `initChatModel` / LangChain chat models — OpenAI, Anthropic, OpenRouter via env. No cloud account in-product.

---

## 13. Rewind, ANALYZE, tests, errors

### V0

- Rewind to any completed turn (snapshot restore).
- Inspect node: configuration, runtime state, inputs, outputs, events.
- Stance-aware inspect (God = truth; Possess/Watch-on-actor = packet).
- No chain-of-thought.
- ANALYZE tab = turn slider + inspector.

### V1

- **BRANCH HERE** — clone snapshot, tweak config (e.g. paranoia 82 → 45), run, compare endings.
- **Scenario Test** node + CLI Monte Carlo (`nuclear_war < 20%`).
- Overlays: Reality / Perception / Relationships / Resources / Messages.
- “View as: Vesper Union” rewrites the canvas to that actor’s believed world.

### Errors

Studio: English only. Compile mismatches, illegal actions, “model did not return a legal action — retrying / waiting.” Model outage pauses; it does not commit a half turn. God edits that would break ports are refused before the log.

Runtime process may log stacks. Studio Developer pane is a hidden escape hatch, not the default UI.

---

## 14. Dead Channel Lite (V0 proof)

A Machina **project** checked into `examples/dead-channel-lite/` so it can be opened in the studio and run headlessly. Still editor-owned — not a privileged engine mode.

Contents, all from V0 primitives + presets:

- Two Nation presets: Atlantic Federation, Vesper Union.
- Each: Head of State + one other advisor (Intelligence or Military) — two advisors each.
- Personality, Memory, Perception (noisy enemy observations).
- Relationship system between the two actors.
- Diplomacy as a configured `systems.system` (or a bundled Diplomacy preset wrapping System).
- Clock, Event log, Inspector.
- Incomplete information: agents never receive true enemy resources/readiness.

Run 20 turns. Operator can Watch the pulse, pause and God-drop a resource, Possess an advisor and pick the action.

**Forbidden:** `if (project.name === "dead-channel")` anywhere in core, kernel, compiler, studio, or node-sdk. Geopolitics plugin is post-V0.

---

## 15. Repo layout

```
apps/studio/              # Next.js, XYFlow, Tailwind 4, shadcn, Motion
apps/runtime/             # Node HTTP+WS+CLI
packages/core/
packages/graph/
packages/simulation/
packages/agents/
packages/persistence/
packages/node-sdk/
packages/ui/
plugins/core/
examples/dead-channel-lite/
docs/superpowers/specs/
```

Monorepo: pnpm + TypeScript. Studio talks to runtime; it does not import kernel internals. Shared types come only from `packages/core` and `packages/node-sdk`.

---

## 16. Parallel workstreams

Contracts freeze in Wave 0. Then packages move in parallel. Dead Channel Lite is last.

| Wave | Workstream | Owns | Depends on |
|---|---|---|---|
| 0 | Core IR + node-sdk + ui primitives | Types, ports, `defineNode`, default inspector/node chrome | nothing |
| 1a | Compiler | IR → SimulationPlan, English errors | Wave 0 |
| 1b | World kernel | Turn loop, RNG, systems dispatch, snapshots, interventions | Wave 0 |
| 1c | LangGraph agents | Subgraphs, interrupt, tokens, checkpointer adapter | Wave 0 |
| 1d | Persistence | Drizzle + PGlite + project folder read/write | Wave 0 |
| 1e | Studio | Canvas, library, inspector, nested graphs, BUILD | Wave 0 |
| 1f | Runtime API | HTTP, WS, CLI, process wiring | Wave 0 (stubs ok until 1a–1d exist) |
| 2 | Presets + LLM compose | Save preset, describe loop, smoke | 1a, 1e, plugins/core |
| 2b | RUN instrumentation | Live graph, stances, possess UI, god pause | 1b, 1c, 1f, 1e |
| 3 | Dead Channel Lite | Example project + 20-turn proof | everything above |

Wave 1 streams may use fixture IR JSON and a fake runtime until peers land. They must not invent a second IR.

---

## 17. Version tags

### V0 (this spec’s implementation target)

- Canvas: drag, connect, inspector, persistence, nested graphs.
- Core kinds listed in §11.
- Compile, validate, turn loop, agents, actions, events, snapshots.
- Run / pause / step / reset / speed.
- Watch / God / Possess.
- Rewind + inspect.
- Handmade presets + LLM compose-with-gate.
- PGlite + project folders. No Docker required.
- Dead Channel Lite proof.
- Headless `machina run`.

### V1 (specified, not built)

- BRANCH HERE / counterfactual compare.
- Scenario Test + Monte Carlo.
- Reality / perception overlays.
- Invent-a-node via LLM + SDK.
- `plugins/geopolitics` (and Diplomacy/Trade/Combat as real kinds).
- Describe polish beyond the V0 gate.

### Later

- Cloud, accounts, billed tokens, multiplayer.
- Desktop shell (Tauri/Electron).
- Plugin marketplace.
- Civilization / facility palettes.
- Real Postgres server swap (schema already compatible).

---

## 18. Testing (engine)

V0 engine tests (not the Scenario Test node):

- Port matcher: legal / illegal edges.
- Compiler: missing Clock, unknown kind, nested portal ports.
- Kernel: seeded systems produce identical event logs with agents mocked.
- Interventions appear in the log and survive rewind.
- Possessed ACTION is accepted as a normal action.
- LLM compose: invalid proposal is not saved; valid proposal round-trips through compile.
- Dead Channel Lite: 20-turn headless run with mocked models produces N events and no truth leak into stored packets.

V1: visual Scenario Test node and Monte Carlo assertions.

---

## 19. Non-goals (V0)

- Multiplayer / Figma-like presence.
- Auth, teams, cloud hosting.
- Docker or a local Postgres install.
- Treating React Flow JSON as the runtime.
- Putting the world clock inside LangGraph.
- Showing chain-of-thought.
- Dead Channel mechanics hardcoded in core.
- Inventing new node runtimes from a prompt.
- Marketplace / dynamic plugin zip loading.

---

## 20. Stack

Next.js, TypeScript, React, `@xyflow/react`, Tailwind 4, shadcn, Motion, LangGraph, LangChain, PGlite, Drizzle, Zod.

LangGraph is used for: per-agent stateful subgraphs, Postgres/PGlite checkpoints, `interrupt()` for Possess, streaming, `getState` / time-travel on the **agent** thread. World rewind is Machina snapshots, not LangGraph graph time-travel of the whole simulation.

---

## 21. Success

A person who does not think in types can: open Machina, drop two Nation presets, hit Run, watch edges pulse, pause, cut a resource as God, possess an advisor, pick an action, rewind to turn 7, and understand why that advisor was afraid — from the packet, not from a prompt dump.

Then: 20 turns of Dead Channel Lite, headless, no core hacks.

That is Machina V0.

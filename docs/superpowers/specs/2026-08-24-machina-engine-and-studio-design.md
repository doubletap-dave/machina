# Machina — Engine, API, and Studio (this cycle)

Date: 2026-08-24  
Status: Draft for user review

This spec supersedes the original V0 design (`2026-08-24-machina-design.md`) where they conflict. Frozen packet/port contracts in `@machina/core` stay. Product shape does not.

---

## 1. What Machina is

Machina is a **simulation engine other products run worlds on**.

Studio is **not** the product. Studio is how people **build** a world, **compile** it, and **test** it in this repo before a game, a campaign tool, or any other frontend talks to the engine.

Consumers include: agent-based simulations, games, dungeon-master / RPG tools, custom web UIs. Their interface is whatever they want (map, chat, tabletop). Machina supplies the world loop, typed observations, actions, events, and rewind.

**If Studio can run a world and a foreign app cannot, Machina failed.**

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Product | Engine + project files. Studio is an authoring and in-repo test client. |
| Visual vs execution | Canvas is intent only. Positions never enter the kernel. |
| Other apps | Two doors, same engine: in-process library and HTTP + WebSocket. |
| Studio Run | Real compiler and kernel. No fake turn counters, no placeholder observation packets as the finished path. |
| Models | Real LLM calls for agents. No mock models as a product feature. |
| Missing / failed model | Pause. Do not invent an action. Do not commit a half-turn. Possess uses the same action slot as Think. |
| Speed | Play / pause / step only. No 10× / 100× simulation speed. Optional **skip animations** (presentation only). |
| Typeface | IBM Plex Sans (UI), IBM Plex Mono (turns, cost, numbers). Not Geist. |
| Chrome copy | Sentence case. `Build` `Run` `Analyze`, not `BUILD`. |
| Nation | Preset (Actor + nested cabinet), not a core engine kind. |
| Proof | Dead Channel Lite: two nations, two advisors each, 20 turns, no scenario-name hacks in core, kernel, compiler, studio, or node-sdk. |

Rejected: Studio as the only way to run a world; React Flow nodes as LangGraph nodes; mock think as “it works”; speed multipliers that pretend LLMs go faster.

---

## 3. Scenario document (what used to be called “IR”)

The operator never authors this by hand. Studio (or any client) generates it.

A **project** is a folder:

```
<project>/
  machina.json          // id, name, entry graph, preset refs
  graphs/<id>.json      // nodes, edges, nested-graph links
  presets/              // project-local presets
  assets/
```

A node has: `id`, `kind`, `version`, `position` (editor-only), `config`, optional `subgraphId`.  
An edge has: `id`, `sourceNode`, `sourcePort`, `targetNode`, `targetPort`.

**Compile** turns that document into a **simulation plan**. Invalid worlds do not start. Failures are English sentences.

Layout (zoom, positions, pretty cards) is stripped before compile. Other apps load the folder, not a screenshot of Studio.

---

## 4. Architecture

```
Other apps, CLI, Studio
        │
        ├─ in-process:  @machina/engine
        └─ over network: @machina/client  →  apps/runtime (HTTP + WebSocket)
                          │
                          ▼
        compile (packages/graph)
        kernel (packages/simulation)
        cognition (packages/agents / LangGraph)
        persistence (packages/persistence)
        kinds (plugins/core)
```

Studio talks **only** to `@machina/client` (or the engine behind it). Studio does **not** import kernel internals or invent a second stepper.

`@machina/engine` and the runtime process are two doors into the **same** compile + kernel + agent path. Same packets, same events, same rewind.

---

## 5. Library and HTTP (other products)

### 5.1 In-process (`@machina/engine`)

Intended for games and tools that want the world in their own process.

```ts
const engine = await MachinaEngine.open("./worlds/my-campaign");
const compiled = engine.compile(); // plan or English errors
const run = await engine.start({ seed: 7, stance: "watch" });

await run.step();
run.pause();
run.resume();
run.rewind(18);

run.observation(actorId);          // what they believe, not truth
await run.submitAction(action);    // same shape as a model action
run.viewAs(actorId);               // believed-world snapshot for overlays
run.subscribe((msg) => { /* turn, events, node-active, edge-pulse, possess-wait, error */ });
```

Consumers **never** receive true world state through Watch/Possess. God inspection of truth is an operator/Studio concern, not a game default.

### 5.2 HTTP + WebSocket (`apps/runtime` + `@machina/client`)

Same operations, same JSON shapes. Studio is one client.

| Method | Purpose |
|--------|---------|
| `POST /compile` | Validate project → plan or English errors |
| `POST /runs` | Start from project + seed + stance |
| `POST /runs/:id/pause` `resume` `step` | Transport |
| `POST /runs/:id/stance` | watch / god / possess |
| `POST /runs/:id/interventions` | God edits; **409** if not paused |
| `POST /runs/:id/possess/action` | Human fills Think slot |
| `POST /runs/:id/rewind` | Restore snapshot |
| `GET /runs/:id` | Turn, cost, errors |
| `WS /ws` | Live messages |

Live messages: `turn`, `node-active`, `edge-pulse`, `event`, `possess-wait` (real packet + legal actions), `error` (English).

CLI: `machina run <dir> --turns N` uses the same engine as the library. No UI.

---

## 6. Cognition (LLMs are the actors)

Every `cognition.agent` Think slot is a **real model call**, unless a human is Possessing that node.

- Play keeps requesting the next **full** turn. Wall-clock time is however long the models take.
- Pause: do not start the next turn; never commit a half-turn.
- Step: one full turn, then stop.
- **Skip animations:** hide or shorten edge pulses / clock motion. Does **not** change model latency or turn semantics.
- No API key / model outage: English error, pause, wait for Possess or a working model. **Do not invent thoughts.**

---

## 7. Studio (author + in-repo test)

Studio exists so **this project** can assemble a world and prove the engine before other apps consume it.

### 7.1 Shell

```
Machina    <project name>     Build  Run  Analyze              ▶ Run
----------+----------------------------------------------+-----------
 Library  |                                              | Inspector
 (collapsible)              canvas                         (collapsible)
----------+----------------------------------------------+-----------
 Turn 18           Events 12     Cost $0.47     Errors 0     [Skip animations]
```

- Dark infinite canvas. IBM Plex. Quiet accents by family/state. No neon soup, no giant pills, no all-caps chrome.
- Command palette (Ctrl+K): display names only, never `cognition.agent`.
- Describe (Build): sentence → propose graph from **registered kinds only** → compile gate → materialize. Invalid proposals are not saved. The proposer is a real model (or the operator builds by hand). A keyword-heuristic “fake compose” is not the product. No model key: English error, save nothing.

### 7.2 Canvas (must actually work)

React Flow must stay in sync with the project store: **`onNodesChange` (or equivalent) so nodes drag**, pan, zoom, select, connect. Persist positions on drag end.

- Illegal wires: no edge, English toast.
- Double-click container with nested graph: enter subgraph. Header control to go back.
- `fitView` must not fight the operator after the first load (do not reset layout on every store tick).

### 7.3 Library (operator palette)

| Group | Contents |
|-------|----------|
| Presets | Nation, Cabinet, Agency; templates New world, Example world |
| Actors | Actor |
| World | World, Resource, Clock, Event |
| Behavior | Agent, Goal, Personality, Memory, Perception |
| Systems | System (mechanic e.g. diplomacy), Relationship |
| Output | Logger, Inspector |

Presets **materialize** nested graphs on drop. Nation is not a fake kind.

V1 kinds (Condition, Router, generic Transform, Scenario Test) stay **off** the palette until they exist as real plugins. Empty boxes that pretend to be those kinds are forbidden.

### 7.4 Nodes as small apps

Not title chips.

- **Personality:** sliders on the card (aggression, paranoia, cooperation, risk), bound to the same config as the inspector.
- **Actor / Nation preset:** name; live vitals when a run is active.
- **Agent:** name, model, idle/active, last **action label**. No chain-of-thought.
- **Clock:** period.
- **System:** mechanic name.

Inspector: generated from the kind’s schema unless a custom inspector exists. Personality sliders 0–100.

### 7.5 Build / Run / Analyze

**Build** — drag, connect, inspect, presets, describe, validate (compile).

**Run** — palette recedes; canvas is instrumentation. Play / pause / step. Watch / God / Possess. Edges pulse from **real** `edge-pulse` / activity messages. Possess-wait shows **legalActions as buttons** and a short facts list from `observations[].attribute`. Packet comes from the engine.

**Analyze** — turn slider rewinds **real snapshots**. Inspect configuration, inputs, outputs, events for that turn. No chain-of-thought.

**Overlays** (this cycle): Reality (operator/God truth), Perception (selected actor’s packet), Relationships, Resources. **View as: &lt;actor&gt;** rewrites the canvas to that actor’s believed world. `run.viewAs(actorId)` is the same data a game UI can consume.

**Status bar:** turn, event count, cost, errors, skip-animations toggle.

---

## 8. Truth, God, Possess

1. Agents and Possess receive **observation packets** only. True world state is unreachable from cognition by construction.
2. God changes are `kind: "intervention"` events, only while paused.
3. Possess submits the same `AgentAction` shape as a model. The kernel cannot tell them apart. Fog stays on.

---

## 9. Errors

Studio: English only. Compile mismatches, illegal wires, “model did not return a legal action,” “pause the world before changing it.”

Runtime process may log stacks. Studio developer dump is a hidden hatch, not the default UI.

---

## 10. How we know it works

| Gate | Proof |
|------|--------|
| Drag | Operator can move nodes; positions persist in the project document |
| Compile | English errors or a plan; Studio Validate uses the real compiler |
| Studio Run | Play / pause / step; possess packet from engine; no second fake stepper |
| CLI | `machina run <project> --turns N` |
| Library | Open the same folder; same events and packets |
| HTTP | Same operations as the library |
| Dead Channel Lite | Four agents, 20 turns, packets have no truth leak, grep-clean of scenario hacks in engine/studio source |

Tests are necessary. They do not replace the operator path.

---

## 11. Out of this cycle (do not fake)

- Generated new `defineNode` plugins from a prompt
- BRANCH HERE / side-by-side counterfactuals
- Scenario Test node / Monte Carlo graphs
- 10× / 100× simulation speed
- Mock models as a product feature
- Dedicated geopolitics plugin (diplomacy remains a System config)

---

## 12. Stack (unchanged unless this spec says otherwise)

Node 22 · pnpm 9 · TypeScript · Vitest · Zod · Next.js · React · `@xyflow/react` · Tailwind 4 · Drizzle · PGlite · LangGraph for cognition only.

Design tokens live in `@machina/ui` (Plex, canvas `#0c0c0c`, quiet accent). Node `editor` / `inspector` React components may attach via `@machina/node-sdk` without putting kernel types in agent code.

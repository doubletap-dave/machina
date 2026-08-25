# Machina — Studio and engine complete

Date: 2026-08-25  
Status: Approved for implementation planning  
Parent: `2026-08-24-machina-design.md`  
Supersedes (Studio operator surface): canvas as a *view* of `project-store`; port pictogram SVGs; Appearance in the status bar; Inspector special-cases; kernel ignoring the plan’s packet wires.

This cycle makes Studio a React Flow editor, every core kind editable, Watch/God/Possess real header buttons, theme and dots/snap/MiniMap actually usable, and the kernel consume compiled configs. It does **not** invent kinds, add `PortType`s, put keys in the world folder, or add scenario-name hacks.

---

## 1. Goal

An operator can drop nodes the way [React Flow’s examples](https://reactflow.dev/examples) do, name and configure every kind in the Inspector, run a world, press **Watch / God / Possess**, and have Think read Goal / Personality / Memory from the graph. Chrome does not jump between tabs. Theme paints the whole Studio. The canvas has dots, snap, and a MiniMap that pans and zooms.

**Done when:**

1. Library drag-drop lands a node under the cursor (`screenToFlowPosition`, snap).
2. Clock, Actor, Goal, Logger, and the rest have Inspector fields; empty Goal statement / empty Actor name refuse compile in English.
3. `createKernelFromPlan` feeds `packet.personality` / `goals` / `memory` from wired node configs (not `null`).
4. Header **Watch**, **God**, **Possess** call `POST /runs/:id/stance` and God/Possess UIs match §7.
5. Switching Build / Run / Analyze / Configure does not change header, footer, or column widths.
6. Theme tokens style chrome, nodes, grid dots, and MiniMap. Port colors and shapes do not change.
7. Background is `BackgroundVariant.Dots`. `snapToGrid` is on. MiniMap is bottom-right, pannable, zoomable.

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Canvas live state | `@xyflow/react`: `useNodesState` / `useEdgesState`, `applyNodeChanges` / `applyEdgeChanges`, `addEdge` |
| IR | `GraphDocument` is what Save / Validate / Run send. Positions stripped before compile. Runtime never reads `position`. |
| Nested actor | Child `GraphDocument` loaded into the **same** React Flow instance. Not the Sub Flow parent/child example. |
| Port marks | Geometric primitives, not pictograms. Color hex map unchanged. |
| Port row copy | Type nouns (Tick, Goals, …). Not “when time moves”. |
| Inspector | One form from `KindField[]` on every `defineNode`. |
| Cognition `runtime` | Stay `"none"` as **executors**. Config is real; empty required fields fail compile. |
| Appearance | Configure **page** only. Footer is telemetry. |
| Stances | Header buttons Watch / God / Possess. All V0. Switch mid-run. |
| Grid | Dots, gap 16, snap `[16, 16]`. |
| MiniMap | Official component, `bottom-right`, `pannable`, `zoomable`. |
| Think | Real model. Tests may inject `ThinkFn`. No product mock. |

Rejected: `useNodesState` abandoned for a parallel Machina array that `useMemo`s into RF; Sub Flow grouping as nested worlds; Lucide/pictogram port icons; theme CSS variables for port colors; Appearance in the footer; Analyze/Run collapsing the column grid.

---

## 3. React Flow (editor)

Studio **is** a React Flow app. Docs: Context7 `/xyflow/xyflow` and [reactflow.dev/examples](https://reactflow.dev/examples).

If a Studio gesture has no official example, do not ship a custom gesture. Map:

| Studio | Example / API |
|--------|----------------|
| Add from library | [Drag and Drop](https://reactflow.dev/examples/interaction/drag-and-drop): `application/reactflow` (kind id or `preset:<id>`), `onDragOver`, `onDrop`, `screenToFlowPosition(..., { snapToGrid: true, snapGrid: [16, 16] })` |
| Click library item | Still allowed: add at viewport center, then snap |
| Move / select | `onNodesChange` + `applyNodeChanges` |
| Wires | `onConnect` + `addEdge`; [Validation](https://reactflow.dev/examples/interaction/validation); [Connection Events](https://reactflow.dev/examples/interaction/connection-events) |
| Incomplete rubber-band | `isValidConnection` returns **true** when `source`, `target`, or handles are missing. Full endpoints still `matchPorts` |
| Cards | [Custom Nodes](https://reactflow.dev/examples/nodes/custom-node) |
| Right-click | [Context Menu](https://reactflow.dev/examples/interaction/context-menu). No NodeToolbar. |
| Retarget wire | [Reconnect Edge](https://reactflow.dev/examples/edges/reconnect-edge) |
| Connection line color | [Connection Line](https://reactflow.dev/examples/edges/connection-line) — source port color |
| Dots | `Background` `variant={BackgroundVariant.Dots}` (default in xyflow; we currently omit variant and paint lines). `gap={16}`. Color `--machina-grid-dot`. |
| Snap | `snapToGrid` + `snapGrid={[16, 16]}` on `ReactFlow` |
| MiniMap | `position="bottom-right"`, `pannable`, `zoomable`, `onNodeClick` focuses that node. Width/height explicit (200×120). `nodeColor` / `maskColor` from theme helpers (resolved colors, not `var()`). |
| Controls | `bottom-left`. Must not overlap MiniMap. `proOptions.hideAttribution` stays true. |

### 3.1 Sync with IR

- React Flow `nodes` / `edges` are canonical for the **current graph** while editing.
- On RF mutations (drop, connect, reconnect, delete, position after drag), write through to the current `GraphDocument` (ids, kind, version, config, subgraphId, edges, positions).
- On load template, enter/exit subgraph, undo/redo: `setNodes` / `setEdges` from that document.
- Undo snapshots `{ project, currentGraphId, selectedNodeId }` (existing capacity 50) **and** restores RF from the restored document. Do not keep a second undo stack inside RF.
- Compile / start: `stripPositions` as today.

Do not drive the canvas with `useMemo(toFlowNodes(graph.nodes))` as the only copy of topology. That is what made add-node and wires look dead.

### 3.2 `isValidConnection` and unknown port style

Unknown/empty source port type on an edge: gray stroke `#8a8a8a`, width 2. Do not call `portLanguage("")`.

---

## 4. Studio chrome

### 4.1 Grid (no jump)

```
header  (fixed height, all modes)
body    (flex-1 min-h-0)
  Build / Run / Analyze:  14rem | 1fr | 18rem
  Configure:              full width of body (header + footer unchanged)
footer  (fixed height, telemetry only)
```

Library column stays 14rem on Run and Analyze even if empty (or filled with run-only tools later). It does not collapse. Inspector/Run column stays 18rem. Canvas is always the middle `1fr` on Build / Run / Analyze.

Header: brand, project name, subgraph back, **Build / Run / Analyze / Configure**, then **Watch / God / Possess**. Watch is the default. The three buttons are always visible; they set local stance (sent on `startRun`). After a run exists they also `POST /runs/:id/stance`. Validate stays on Build.

Footer: Turn, Events, Cost, Errors. **No** theme, fonts, or skip-animations.

### 4.2 Configure page

Two sections on one scrollable page:

1. **Models** — existing provider panels (save / remove / refresh / default).
2. **Appearance** — theme, UI font, mono font, skip animations. Same prefs file as today (`studio-prefs`). Sentence case labels.

`AppearanceMenu` leaves the footer. Delete it or reuse its controls inside Configure only.

---

## 5. Port language

`@machina/ui` stays React-free. Colors **frozen** (same hex as port-language spec). Themes must not override them.

Replace `PortSymbolId` pictograms (`clock`, `eye`, `person`, …) with geometric ids. One reusable shape component in Studio; fill = port color; no Lucide; no illustrated SVG.

| PortType | color | symbol | handle hover | **card row label** |
|----------|-------|--------|--------------|-------------------|
| CLOCK | `#e4b84a` | `disk` | Clock | Tick |
| OBSERVATION | `#4ec4d9` | `ring` | Observation | Observation |
| ACTION | `#9ad64a` | `triangle` | Action | Action |
| EVENT | `#e07a3d` | `plus` | Event | Events |
| MESSAGE | `#a78bfa` | `chevron` | Message | Message |
| RESOURCE | `#f0c14b` | `square` | Resource | Stock |
| PERSONALITY | `#e879a8` | `hex` | Personality | Personality |
| GOAL | `#f5e6c8` | `diamond` | Goal | Goals |
| MEMORY | `#2dd4bf` | `bar` | Memory | Memory |
| RELATIONSHIP | `#f472b6` | `double-ring` | Relationship | Stance |
| SIGNAL | `#60a5fa` | `wedge` | Signal | Signal |
| WORLD_STATE | `#94a3b8` | `square-ring` | World state | State |
| ACTOR_REF | `#d6b48a` | `notch` | Actor | Actor |

`defineNode` port `label` values in `plugins/core` **must** match the card row column. Hover still uses `portLanguage(type).label`.

`portLanguage` still throws on unknown `PortType`. Edges with unresolved type never call it (gray fallback).

---

## 6. Kind config and Inspector

### 6.1 `defineNode`

`NodeDefinition` gains `fields: KindField[]` (same type as manifests). Zod `configSchema` remains the validator. Defaults come from `KindField.default` / schema.

Inspector renders **only** from `registry.get(...).fields` (plus agent LLM selects already specified). No personality-only special case. Custom kinds keep `KindManifest.fields` mapped through `kindManifestToDefinition`.

Required compile checks (English, `@machina/core` or `@machina/ui` copy, used by graph validate):

- Actor `name` missing or blank → `This actor needs a name.`
- Goal `statement` missing or blank → `This goal has no statement.`

### 6.2 Core fields

| Kind | Fields |
|------|--------|
| `control.clock` | `period`: enum `turn` \| `day` \| `week` \| `month` \| `year`, default `month` |
| `entities.world` | `name`: string, default `World` |
| `entities.actor` | `name`: string, required |
| `entities.resource` | `name`: string; `amount`: number, default `0` |
| `control.event` | `name`: string; `description`: string |
| `cognition.personality` | `aggression`, `paranoia`, `cooperation`, `risk`: number 0–100, default 50 |
| `cognition.goal` | `statement`: string, required; `priority`: number 0–100, default 50 |
| `cognition.memory` | `seed`: string (what they already know) |
| `perception.perception` | `fog`: number 0–100, default 50 (observation noise) |
| `cognition.agent` | existing `llmProvider` / `llmModel` optional (machine default) |
| `systems.system` | `mechanic`: string, default `generic` |
| `systems.relationship` | `stance`: number 0–100, default 50 |
| `analysis.inspector` | `title`: string, default `Inspector` |
| `analysis.logger` | `record`: enum `events` \| `actions` \| `both`, default `both` |

Starter / example worlds must set Actor names so they still compile.

---

## 7. Stances (header buttons)

Labels: **Watch**, **God**, **Possess**. `aria-pressed` on the active one. `POST /runs/:id/stance` with `{ mode, nodeId? }`. Switch mid-run. Context-menu Possess sets Possess and `nodeId`.

Frozen possess-without-pause copy stays: `Pause a run to possess this actor.` Header Possess while running and not paused: same sentence, do not switch.

### 7.1 Watch

Default. Inspector: selected actor’s latest packet if any, else event summary. Never truth.

### 7.2 God

Inspector: truth from **`GET /runs/:id/truth`** (new). **403** unless the run stance is `god`. Body is a God-only DTO (not imported from `@machina/simulation`):

```ts
type GodView = {
  turn: number;
  actors: Record<string, { name: string; resources: Record<string, number> }>;
};
```

Studio and `@machina/client` use `GodView`. Agents still must not import truth.

Edits **only while paused**. V0 editor: each actor’s `resources` as numbers; submit `POST /runs/:id/interventions` with `{ path: "actors.{id}.resources.{key}", value, noticeable }`. Checkbox **They can notice this**. 409 if not paused (existing). Resume applies through the kernel.

### 7.3 Possess

Targets: selected agent, or all agent descendants of a selected container (existing `legalPossessTargets`). On `possess-wait`: dim canvas except that node; Inspector is facts from `observations` + **legalActions as buttons**. Submit `AgentAction`. No chain-of-thought. Fog stays on.

---

## 8. Engine

Today `compile` fills `SimulationPlan` (clock, systems, perception, analysis, `packetWires`) and `createKernelFromPlan` only takes actor ids. Packets ship `memory: null`, `goals: null`, `personality: null`. Logger/inspector/clock config unused.

### 8.1 Frozen contract extension (`SimulationPlan`)

Additive. Do not rename existing keys.

```ts
agents: Array<{
  nodeId: string;
  actorRef: string;
  graphRef: string;
  packetWires: Wire[];
  packet: {
    personality: unknown; // personality node config or null if unwired
    goals: unknown;       // goal node config or null
    memory: unknown;      // memory node config or null
  };
}>;
analysis: Array<{
  nodeId: string;
  kind: string;
  config: unknown;
  wires: Wire[];
}>;
```

Compiler resolves packet wires to the **source node’s `config`** (personality / goal / memory kinds). Multiple goals: array of those configs. Unwired slot: `null`.

`createKernelFromPlan` must:

1. Put `plan.agents[].packet.*` onto `ObservationPacket` for that `actorRef`.
2. Apply perception `fog` to observation noise (higher fog → more noise / lower confidence). Unwired perception: keep today’s noise.
3. Use clock `period` only as the **label** for the turn in Studio telemetry (engine turn index stays an integer).
4. Set actor display name from `entities.actor` config `name` in truth `actors[id].name`.
5. Logger: emit `InstrumentMsg` for `events`, `actions`, or both per config. Studio Run log shows those.
6. Analysis Inspector: Run-mode inspector pane title from config; shows wired world-state summary, not the Build Inspector form.

Cognition kinds remain `runtime: "none"` (no turn-loop executor). They are not stubs: missing required config fails compile; wired config is what Think reads.

---

## 9. Theme everywhere

`html[data-machina-theme]` already set. **Use the tokens** on every chrome surface: header, library, node card (`--machina-node-fill` / `--machina-node-stroke` / `--machina-text`), inspector, Run, Analyze, Configure, footer, stance buttons, React Flow `Background` / MiniMap / Controls.

Ban hardcoded `neutral-800` / `neutral-900` as the only colors on those surfaces. Port handle fill stays `portLanguage.color`.

New token:

| CSS variable | Role |
|--------------|------|
| `--machina-grid-dot` | Background dots (per theme, low contrast on canvas bg) |

Add to `THEME_CSS_VARS` and each theme block in `globals.css`. MiniMap helpers already read `--machina-minimap-node` / `--machina-minimap-mask`; pass a live `getComputedStyle` from the themed root so switching theme updates the MiniMap.

---

## 10. English (new)

| Situation | Copy |
|-----------|------|
| Actor name blank | `This actor needs a name.` |
| Goal statement blank | `This goal has no statement.` |
| Possess header while running unpaused | `Pause a run to possess this actor.` (existing) |

---

## 11. Tests (required)

- Library DnD: drop payload kind → node at snapped flow position (unit around drop handler + `screenToFlowPosition` mock).
- `isValidConnection` incomplete drag is `true`; RESOURCE→PERSONALITY still `false`.
- `flowEdgeStyle("")` does not throw.
- Every kind in §6.2 has a non-empty `fields` array. Inspector shows a labeled control for Clock `period`.
- Compile fails on nameless actor and statement-less goal.
- Kernel test: wired personality/goal/memory appear on `packet` (no network).
- Logger config `actions` does not emit event-type instruments (and vice versa).
- Header Watch / God / Possess buttons (sentence case). `GET /runs/:id/truth` is 403 in Watch. God intervention 409 when unpaused.
- MiniMap: rendered with `pannable` (component/contract test).
- Theme: MachinaFlowNode fill uses `var(--machina-node-fill)` or computed token; `PORT_LANGUAGE` colors unchanged.
- Port symbol ids are the geometric set; card shows `Tick` not `when time moves`.

Engine tests: no network, no real LLM.

---

## 12. Out of scope

New `PortType`s. Prompt-invented plugins. RF Sub Flow as nested worlds. NodeToolbar. Collaborative / Pro-only examples (helper lines, copy-paste Pro). Overlays/view-as (engine-and-studio task 12) beyond God truth + Possess dim. Dead Channel Lite as a special case. Keys in the project folder. Product mock Think.

---

## 13. Prime directives (unchanged)

IR-first for **runtime**. Truth isolation. Compile then run. God writes events. Possess = Think slot. No `if (project.name === "dead-channel")`.

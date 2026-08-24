# Machina Lane 2a — Presets + LLM compose

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Run only after Wave 1 is merged. Writable: `plugins/core/src/presets/**`, `packages/graph/src/compose.ts`, `packages/graph/tests/compose.test.ts`, `apps/studio/src/presets/**`. Do not edit `plugins/core/src/kinds.ts`.

**Goal:** Handmade presets (Nation, Cabinet, Agency) plus describe→compile-gate→smoke→save.

---

### Task 1: Nation preset materialize

**Files:**
- Create: `plugins/core/src/presets/nation.ts`, `plugins/core/src/presets/index.ts`, `plugins/core/tests/presets.test.ts`

**Interfaces:**

```ts
export type Preset = {
  id: string;
  name: string;
  category: string;
  builtin: boolean;
  graph: import("@machina/core").GraphDocument;
  extraGraphs: import("@machina/core").GraphDocument[];
};

export function nationPreset(name: string): Preset;
export function cabinetPreset(name: string): Preset;
export function agencyPreset(name: string): Preset;
export function listBuiltinPresets(): Preset[];
```

Nation: parent node `entities.actor` named `name` with subgraph containing: personality, goal, memory, two `cognition.agent` (Leader, Advisor), perception, wired legally. `builtin: true`.

- [ ] **Step 1: Test `nationPreset("Atlantic Federation").graph.nodes` includes an actor; `extraGraphs[0].nodes` kinds include `cognition.agent` twice; `compile` of a project that uses this preset + a clock + world returns a plan (not errors).**

Construct `MachinaProject` in the test: clock, world, two nation presets, relationship system, diplomacy `systems.system` `{ mechanic: "diplomacy" }`.

- [ ] **Step 2: Implement presets so compile succeeds. PASS. Commit** `feat: add builtin Nation Cabinet Agency presets`

---

### Task 2: LLM compose gate

**Files:**
- Create: `packages/graph/src/compose.ts`, `packages/graph/tests/compose.test.ts`

**Interfaces:**

```ts
export type ComposeProposer = (prompt: string, kinds: string[]) => Promise<MachinaProject>;

export async function composeFromDescription(
  prompt: string,
  registry: NodeRegistry,
  proposer: ComposeProposer,
  smoke: (project: MachinaProject) => Promise<{ ok: boolean; message?: string }>,
  maxRepairs?: number,
): Promise<{ project: MachinaProject } | { errors: MachinaError[] }>;
```

Default `maxRepairs = 3`. Loop: propose, `compile`, if errors and attempts < max, call proposer again (same function; test uses a closure that returns invalid then valid). If smoke `ok: false`, treat as error `message`. Never return a project that fails compile.

- [ ] **Step 1: Tests:** proposer returns project without clock twice then with clock; expect success and `proposer` called 3 times. Proposer always invalid ×4 → `{ errors }` no project. Smoke fail → errors, no project.

- [ ] **Step 2: Implement + PASS + commit** `feat: add LLM compose compile-and-smoke gate`

---

### Task 3: Save as preset (pure function)

**Files:**
- Create: `apps/studio/src/presets/save-preset.ts`, `apps/studio/src/presets/save-preset.test.ts`

**Interfaces:**

```ts
export function graphFromSelection(
  project: MachinaProject,
  graphId: string,
  nodeIds: string[],
): { graph: GraphDocument } | { error: MachinaError };

export async function copyPresetToUserLibrary(
  preset: Preset,
  homeDir: string,
): Promise<string>;
```

If `compile` of `{ ...project, graphs: [extracted] }` would fail, return English error. Else return a new GraphDocument with those nodes and internal edges only. `copyPresetToUserLibrary` writes `homeDir/.machina/presets/<id>/graph.json` and returns that path. Copies have `builtin: false`.

- [ ] **Step 1: Test selection of two connected resource-compatible nodes succeeds; empty selection errors `Select something to save as a preset.` Copy into a temp `homeDir` creates the file.**

- [ ] **Step 2: Implement + commit** `feat: save selection as a Machina preset`

---

Lane 2a done when builtin nations compile and compose gate never saves invalid IR.

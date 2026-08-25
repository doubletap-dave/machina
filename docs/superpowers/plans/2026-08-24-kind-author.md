# Kind author Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operators define kinds (ports + fields, no simulation). Project folder is self-contained with pinned hashes. Library is a copy. Compile may succeed; `engine.start` refuses until a plugin supplies `runtime`.

**Architecture:** `KindManifest` JSON in `kinds/`. `loadProject` return type **unchanged**. New `loadKindManifests` + `verifyProjectKinds`. `kindManifestToDefinition` omits `runtime`. `"none"` remains legal to run; `undefined` is not.

**Tech Stack:** TypeScript, Zod (generated from fields), Vitest, Node `crypto.subtle`.

**Spec:** `docs/superpowers/specs/2026-08-24-kind-author-design.md`  
**Lane:** `lane/studio-kind-author`

## Global Constraints

- Do not add `PortType` values. Do not steal plugin-core ids.
- Id: `/^custom\.[a-z0-9]+(?:-[a-z0-9]+)*$/`
- English from `@machina/core` `kind-english.ts`; engine does not import `@machina/ui`.
- Do not edit `Canvas.tsx` or `MachinaFlowNode.tsx`.
- Store: add kinds/pin APIs only; do not rewrite canvas undo if present.
- TDD, no network, no LLM.
- `pnpm add` only if a dep is missing; prefer std + existing zod.

---

### Task 1: Manifest, hash, English

**Files:**
- Create: `packages/core/src/kind-manifest.ts`
- Create: `packages/core/src/kind-hash.ts`
- Create: `packages/core/src/kind-english.ts`
- Create: `packages/core/src/kind-hash.test.ts`
- Create: `packages/core/src/kind-english.test.ts`
- Modify: `packages/core/src/index.ts`

Copy `KindManifest` / `KindField` from the spec. `canonicalKindJson` sorts keys recursively. `kindHash` uses `crypto.subtle.digest("SHA-256")` → lowercase hex.

- [ ] **Step 1: Test** two manifests equal except key order → same hash. Different `cardColor` → different hash. `kindNoRuntimeCopy("Radio", "custom.radio")` equals `{name} ({id}) has no simulation yet. Ship a plugin or remove it from the graph.` with those values.

- [ ] **Step 2: Implement. PASS. Commit** `feat: add kind manifest types hash and english copy`

---

### Task 2: Manifest → NodeDefinition

**Files:**
- Create: `packages/node-sdk/src/from-manifest.ts`
- Create: `packages/node-sdk/src/from-manifest.test.ts`

`kindManifestToDefinition` sets `type: id`, `metadata.name/category`, `ports`, Zod object from `fields` (string/number/boolean/enum), **omits `runtime`**.

- [ ] **Step 1: Test** register definition; `getOrThrow("custom.radio-desk", 1)` works; `configSchema.parse({})` applies defaults; `runtime` is `undefined`.

- [ ] **Step 2: Implement. PASS. Commit** `feat: convert kind manifests into node definitions`

---

### Task 3: Persistence kinds I/O

**Files:**
- Modify: `packages/persistence/src/project-files.ts`
- Modify: `packages/persistence/tests/project-files.test.ts`

`ProjectMeta.kindPins?`. `saveProject(dir, project, kinds = [])`. `loadKindManifests(dir)`. `verifyProjectKinds(dir, pins)` → `MachinaError[]`. `loadProject` still returns `MachinaProject` (graphs + meta). Missing `kinds/` is empty, not an error.

- [ ] **Step 1: Test** round-trip one kind + pin. Unpinned extra file → `KIND_UNPINNED_FILE`. Wrong hash → `KIND_PIN_MISMATCH`. Missing file for pin → `KIND_PIN_MISSING_FILE`. Old folder without `kindPins` still loads.

- [ ] **Step 2: Implement. PASS. Commit** `feat: persist pinned project kinds beside graphs`

---

### Task 4: Engine compile + start refuse

**Files:**
- Modify: `packages/engine/src/engine.ts`
- Modify: `packages/engine/tests/engine.test.ts`

`openEngineFromProject(project, { think?, kinds? })`. `openEngine(dir)` loads kinds + verify. Compile registers core + manifests. `start`: after compile, if any flattened node’s def has `runtime == null`/`undefined`, return/throw `KIND_NO_RUNTIME` using `kindNoRuntimeCopy` (do not start the run). Personality `runtime: "none"` still starts.

- [ ] **Step 1: Test** graph with `custom.foo` compiles (legal CLOCK wire) and `start` fails with frozen copy. Clock+world+logger without custom kinds still starts with injected think.

- [ ] **Step 2: Implement. PASS. Commit** `feat: refuse engine start when authoring kinds lack runtime`

If models-lane also edits `engine.ts`, keep `createLlmThink` behavior; add the kind check **before** `createRun`.

---

### Task 5: Studio author + library

**Files:**
- Create: `apps/studio/src/kinds/kind-library.ts` — `libraryDir()`, publish, add-from-library, `homedir()` injectable for tests
- Create: `apps/studio/src/kinds/kind-library.test.ts`
- Create: `apps/studio/src/kinds/KindAuthorForm.tsx`
- Modify: `apps/studio/src/components/Library.tsx` — **New kind**
- Modify: `apps/studio/src/components/Inspector.tsx` — fields from `KindField[]` for manifest kinds
- Modify: `apps/studio/src/lib/project-store.ts` — in-memory kinds + pins + drop edges when a port is removed
- Modify: `packages/ui/src/english.ts` — re-export core kind copy

Publish confirm: `Replace the library copy of this kind?` Reserved id: `kindIdReservedCopy()`. Banner when library hash ≠ pin: `A newer library copy of {name} exists.` + **Use library version**.

- [ ] **Step 1: Tests** cannot save `entities.actor`; `custom.radio-desk` allowed; publish then add-from-library with temp dirs; mocked homedir.

- [ ] **Step 2: Implement. PASS. Commit** `feat: add studio kind author and user kind library`

---

### Task 6: Lane report

- [ ] `pnpm test`. `docs/reports/lane-studio-kind-author.md`. Update `AGENTS.md`. Commit `docs: kind-author lane report`

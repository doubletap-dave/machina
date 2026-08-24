# Machina Lane 1e — Studio BUILD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `apps/studio/**` only. Talk to runtime over HTTP later; V0 BUILD may keep IR in React state and call `saveProject` from persistence **or** POST `/projects` when 1f exists. Prefer in-memory IR + a “Save…” that uses `@machina/persistence` `saveProject` with a user-picked directory via a small Node route is 1f’s job. For this lane: canvas + library + inspector + nested graph navigation generating `MachinaProject` in memory. Persist via `window.machinaSave` callback prop or download JSON in tests using a pure `projectFromFlow` helper.

**Goal:** Dark XYFlow studio: library of human names, typed connections, inspector forms, enter/exit nested graphs. BUILD mode only.

**Architecture:** React Flow nodes are views of `MachinaNode`. Source of truth in a `ProjectStore` (Zustand or React context) holding `MachinaProject`. Connecting two handles calls `matchPorts`; on error show English toast, do not add the edge.

**Tech Stack:** Next.js 15 app router, React 19, `@xyflow/react`, Tailwind 4, `@machina/core`, `@machina/node-sdk`, `@machina/plugin-core`, `@machina/ui`.

---

### Task 1: project store + port refusal (no UI yet)

**Files:**
- Replace stub `apps/studio` with a Next app under `apps/studio` (create-next-app is fine: TS, app router, no src dir OR with `src/` — pick `apps/studio/src`).
- Create: `apps/studio/src/lib/project-store.ts`, `apps/studio/src/lib/project-store.test.ts`

If Vitest in a Next app is painful, put tests in `apps/studio/src/lib/project-store.test.ts` and add `"test": "vitest run"` with vitest config `environment: "node"`.

**Interfaces:**

```ts
export function createProjectStore(registry: NodeRegistry): {
  getProject(): MachinaProject;
  addNode(kind: string, position: { x: number; y: number }): MachinaNode;
  addEdge(edge: Omit<MachinaEdge, "id">): MachinaError | null;
  selectGraph(id: string): void;
  enterSubgraph(nodeId: string): void; // requires node.subgraphId
  exitSubgraph(): void;
};
```

- [ ] **Step 1: Tests**

1. `addNode("cognition.personality")` → node.kind that, `version: 1`, project.graphs[0].nodes length 1. Library name is not stored as kind display — store still uses kind.
2. `addEdge` resource→personality ports → returns error message `A resource can't shape a personality. Attach it to a nation or an economy.` and edges stay [].
3. Matching RESOURCE→RESOURCE on two resource nodes succeeds.
4. `enterSubgraph` on node without subgraphId no-ops; with subgraphId created on addNode for `entities.actor` (when adding actor, also create a child graph and set `subgraphId`). `exitSubgraph` returns to parent.

When adding `entities.actor`, create `GraphDocument` `{ id: crypto.randomUUID(), parentGraphId: current, parentNodeId: node.id, nodes: [], edges: [] }` and set `node.subgraphId`.

- [ ] **Step 2: Implement store + PASS + commit** `feat: add studio project store with typed edges and nested graphs`

---

### Task 2: BUILD shell UI

**Files:**
- Create: `apps/studio/src/app/page.tsx`, `apps/studio/src/app/layout.tsx`, `apps/studio/src/app/globals.css`, `apps/studio/src/components/StudioShell.tsx`, `apps/studio/src/components/Library.tsx`, `apps/studio/src/components/Inspector.tsx`, `apps/studio/src/components/Canvas.tsx`

**Interfaces:** UI only. Library lists `registry.list()` using `metadata.name` and `metadata.category` — **never show `type` string in the library DOM**. Inspector for personality renders sliders 0–100 for aggression, paranoia, cooperation, risk bound to `node.config`. Modes BUILD / RUN / ANALYZE in the header; RUN/ANALYZE can be disabled buttons. Canvas background `#0c0c0c` from `@machina/ui` `canvasBg`.

- [ ] **Step 1: Manual-ish test via a `StudioShell.test.tsx` using `@testing-library/react`:** render Library, expect `Personality` and not `cognition.personality`. Click Personality, expect a node in the document (role or text `Personality`).

- [ ] **Step 2: Implement XYFlow `ReactFlow` as the canvas (required). Custom node shows `metadata.name`. `onConnect` uses store.addEdge. Add `CommandPalette` (⌘K / Ctrl+K) listing `registry.list().metadata.name` only — selecting one calls `addNode`. No `type` strings in palette UI.**

- [ ] **Step 3: Commit** `feat: add BUILD studio shell with XYFlow canvas`

---

Lane 1e done when library shows human names, illegal edges refused, actor enter/exit subgraph works, XYFlow is the canvas.

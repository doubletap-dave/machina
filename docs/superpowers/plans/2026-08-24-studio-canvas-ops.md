# Studio canvas ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Studio canvas a real editor: delete, duplicate, undo, context menus, visible MiniMap, hidden React Flow attribution, legal wires that persist.

**Architecture:** `project-store` is source of truth. React Flow paints it. Mutations go through store APIs + an in-memory undo stack. Do not touch port colors, themes, kinds, or Think.

**Tech Stack:** TypeScript, Vitest, React 19, `@xyflow/react` 12, existing `@machina/studio`.

**Spec:** `docs/superpowers/specs/2026-08-24-studio-canvas-ops-design.md`  
**Lane:** `lane/studio-canvas-ops`  
**Worktree:** `git worktree add ../machina-studio-canvas -b lane/studio-canvas-ops`

## Global Constraints

- IR-first; positions never enter the kernel.
- English errors only in Studio; reuse `matchPorts` copy.
- TDD: failing test → minimal code → refactor. No network, no real LLM.
- Do not edit `MachinaFlowNode.tsx` unless connect is still broken after `connectionRadius` / `isValidConnection`.
- Create stub `apps/studio/src/canvas/edge-language.ts` and **leave the body empty** (ports lane fills it).
- Target ~200 LOC per new file; split undo out of the store.
- Conventional commits. `pnpm test` before claiming done.
- No `if (project.name === "dead-channel")`.

---

### Task 1: Undo stack + delete/duplicate store APIs

**Files:**
- Create: `apps/studio/src/lib/undo-stack.ts`
- Create: `apps/studio/src/lib/project-store.test.ts`
- Modify: `apps/studio/src/lib/project-store.ts`

**Interfaces:**

```ts
export type EditorSnapshot = {
  project: import("@machina/core").MachinaProject;
  currentGraphId: string;
  selectedNodeId: string | null;
};

export function createUndoStack(limit?: number): {
  push(snapshot: EditorSnapshot): void;
  undo(): EditorSnapshot | undefined;
  redo(): EditorSnapshot | undefined;
  clear(): void;
};

// on createProjectStore:
deleteNodes(ids: string[]): void
deleteEdges(ids: string[]): void
duplicateNodes(ids: string[]): string[]
beginDrag(nodeId: string): void // push once if not already dragging
endDrag(): void
undo(): void
redo(): void
```

`deleteNodes` removes incident edges and descendant graphs (`subgraphId` walk via `parentGraphId`). `duplicateNodes` clones config, new UUIDs, +40,+40, copies nested graphs, remaps internal edges only. `replaceProject` clears undo. Cap 50.

- [ ] **Step 1: Write failing tests** in `project-store.test.ts`: add clock+world; `deleteNodes` drops node and edges; undo restores same ids; duplicate actor-with-subgraph yields new graph ids; 51st push drops oldest (use `updateNodeConfig` 51 times); `beginDrag` + many `setNodePosition` + `endDrag` = one undo back to start position.

Use `createRegistry` + `registerCoreKinds`. Starter or minimal project.

- [ ] **Step 2: Run** `pnpm --filter @machina/studio test`  
  Expected: FAIL (APIs missing).

- [ ] **Step 3: Implement** undo-stack + store methods. Drag: `beginDrag` pushes; subsequent `setNodePosition` do not push.

- [ ] **Step 4: Re-run tests.** Expected: PASS.

- [ ] **Step 5: Commit** `feat: add canvas undo delete and duplicate to project store`

---

### Task 2: Valid connect helper + edge-language stub

**Files:**
- Create: `apps/studio/src/canvas/edge-language.ts`
- Create: `apps/studio/src/canvas/is-valid-connection.ts`
- Create: `apps/studio/src/canvas/is-valid-connection.test.ts`

**Interfaces:**

```ts
export function flowEdgeStyle(_portType: string): { stroke?: string } {
  return {};
}

export function isValidMachinaConnection(opts: {
  registry: import("@machina/node-sdk").NodeRegistry;
  nodes: import("@machina/core").MachinaNode[];
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}): boolean;
```

- [ ] **Step 1: Test** RESOURCE out → PERSONALITY in is `false`; CLOCK out → CLOCK in (world clock port) is `true` using real kinds from plugin-core.

- [ ] **Step 2: Run test.** Expected: FAIL.

- [ ] **Step 3: Implement** via `matchPorts`. Create stub `flowEdgeStyle`.

- [ ] **Step 4: PASS. Commit** `feat: add canvas connection validation helper`

---

### Task 3: Canvas keyboard, RF delete, MiniMap, attribution, edges

**Files:**
- Modify: `apps/studio/src/components/Canvas.tsx`
- Create: `apps/studio/src/components/Canvas.test.tsx` (if the package already uses RTL; otherwise test handlers extracted to `apps/studio/src/canvas/selection-delete.ts`)

**Contract:**

- Wrapper `style.background = "var(--machina-canvas-bg, #0c0c0c)"`
- MiniMap `nodeColor` = computed `--machina-minimap-node` or `#8a8a8a`; mask = `--machina-minimap-mask` or `rgba(12,12,12,0.8)` — **not** `#333`
- `proOptions={{ hideAttribution: true }}`
- `deleteKeyCode={null}`
- `isValidConnection` → `isValidMachinaConnection`
- `onConnect` unchanged (`addEdge` + English)
- `onEdgesChange`: `remove` → `deleteEdges`; `select` allowed
- Delete/Backspace when event target is the pane (not `input`/`textarea`): delete RF selected nodes+edges
- Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Meta equivalents → store undo/redo when not in a text field
- Each flow edge `style: flowEdgeStyle(sourcePortType)`
- `onNodesChange`: position + `beginDrag` on first `dragging: true`; `endDrag` on `dragging: false`
- Raise `connectionRadius` if needed (e.g. 20)

- [ ] **Step 1: Test** MiniMap fallback color helper (extract `minimapNodeFill(): string`) ≠ `#333`. Test `flowEdgeStyle("CLOCK")` is `{}`.

- [ ] **Step 2: Implement Canvas wiring. PASS.**

- [ ] **Step 3: Commit** `feat: wire canvas delete shortcuts minimap and hide attribution`

---

### Task 4: Context menu

**Files:**
- Create: `apps/studio/src/components/CanvasContextMenu.tsx`
- Create: `apps/studio/src/components/CanvasContextMenu.test.tsx`
- Modify: `apps/studio/src/components/Canvas.tsx`
- Modify: `apps/studio/src/components/StudioShell.tsx` — pass `onPossessNode` and `runPaused: boolean` (false if no run). Canvas must not import engine.

**Menu:** Node → Delete, Duplicate, Possess (only `entities.actor`). Edge → Delete. Pane → none.

Possess: if `!runPaused` show **exactly** `Pause a run to possess this actor.` Else `onPossessNode(id)`.

- [ ] **Step 1: Component test** possess without pause → frozen string. Delete calls through a mock store.

- [ ] **Step 2: Implement. PASS. Commit** `feat: add canvas context menu for delete duplicate possess`

---

### Task 5: Lane report

**Files:**
- Create: `docs/reports/lane-studio-canvas-ops.md`
- Modify: `AGENTS.md` — note canvas-ops status when merged

- [ ] **Step 1:** Run `pnpm test`. All previously passing tests still pass.

- [ ] **Step 2:** Write report with TDD evidence. Commit `docs: canvas-ops lane report`

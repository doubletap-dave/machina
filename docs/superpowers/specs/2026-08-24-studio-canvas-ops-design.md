# Machina — Studio canvas ops

Date: 2026-08-24  
Status: Approved  
Coordinator: `2026-08-24-studio-operator-surface-design.md`  
Lane: `lane/studio-canvas-ops`  
Depends on: none (current `master`)  
Downstream: port language, themes (seams in §6)

## 1. Goal

The canvas is an editor of `project-store`, not a picture of it. Operators delete, duplicate, undo, right-click, hide the React Flow watermark, see nodes on the MiniMap, and complete legal wires by dragging.

## 2. Current gaps (do not “redesign” around them — fix)

- `project-store` has `addNode`, `addEdge`, `setNodePosition`. **No** `deleteNodes`, `deleteEdges`, `duplicateNodes`, undo.
- `Canvas.tsx` has `onConnect` + `onNodesChange` for drag. **No** `onEdgesChange`, keyboard delete, context menu, `isValidConnection`, `proOptions`.
- MiniMap `nodeColor="#333"` on canvas `#0c0c0c` — nodes are effectively invisible.
- React Flow attribution is visible.

## 3. Lane ownership

**Write**

- `apps/studio/src/lib/project-store.ts`
- `apps/studio/src/lib/undo-stack.ts` (new)
- `apps/studio/src/components/Canvas.tsx`
- `apps/studio/src/components/CanvasContextMenu.tsx` (new)
- `apps/studio/src/canvas/edge-language.ts` (new **stub** — see §6)
- `apps/studio/src/lib/project-store*.test.ts` and canvas/store tests (new or extend existing)

**Read**

- `@machina/core` (`matchPorts`, graph types)
- `@machina/node-sdk` registry (ports for `isValidConnection`)
- `StudioShell.tsx` / run client **only** to pass `onPossessNode` and “is paused?” booleans as props. Do not import `@machina/simulation`.

**Must not edit**

- `packages/ui/src/port-language.ts` (does not exist yet — do not create it)
- `packages/core/src/kind-manifest.ts`, persistence kinds I/O, engine `start`
- Theme CSS / font pickers
- `MachinaFlowNode.tsx` **unless** connect is still broken after Canvas-level fixes (`connectionRadius`, `isConnectable` on `ReactFlow`, handle ids already matching `addEdge`). Prefer not to touch handles so the ports lane owns that file.

## 4. Store API (source of truth)

Add to `createProjectStore`. All mutations except in-drag position go through undo (§5).

```ts
deleteNodes(ids: string[]): void
deleteEdges(ids: string[]): void
duplicateNodes(ids: string[]): string[] // new ids, selection moves to copies
```

**Delete nodes:** remove the nodes; remove every edge with `sourceNode` or `targetNode` in `ids`. If a deleted node has `subgraphId`, delete that graph and **every descendant graph** (walk `parentGraphId`). Undo restores graphs + edges + nodes.

**Delete edges:** only those ids.

**Duplicate nodes:** `structuredClone` config; new `crypto.randomUUID()` for node ids and any copied graph ids; remap edges **among the duplicated set** (internal wires copy; wires to non-copied nodes do not); position `+ { x: 40, y: 40 }`. Nested actor cabinets duplicate as a new graph tree with remapped `parentNodeId` / `subgraphId`.

**Illegal connect:** `addEdge` stays as today (`matchPorts`). Return the error; create nothing.

## 5. Undo / redo

New module `undo-stack.ts`, owned by the store (not React Flow’s internal undo).

- Snapshot: `{ project, currentGraphId, selectedNodeId }` via `structuredClone`.
- Capacity: **50** undo entries. Redo stack clears on a new mutating command.
- **Do not** push on every `setNodePosition` while `change.dragging === true`. Update the node live; **push one snapshot on drag start** (before first move) **or** equivalently restore-to-pre-drag on undo after `dragging === false`. Pick **push on drag start** (simpler): first position event with `dragging: true` for an id that was not already dragging pushes once; subsequent drag events do not push; `dragging: false` does not push again.
- Inspector `updateNodeConfig`: push **once per committed patch** (existing function is already a patch). Do not split keystrokes inside this lane if the inspector still patches per key — if it does, leave it (one undo per patch is acceptable). Do not add debounce unless tests require it.
- Shortcuts: Ctrl+Z undo, Ctrl+Shift+Z or Ctrl+Y redo (and Meta on macOS). Ignore these when a text field / `contenteditable` is focused.
- No confirm dialogs.

`replaceProject` (load) **clears** the undo stack.

## 6. Canvas behavior

**Selection:** React Flow multi-select stays on. Store `selectedNodeId` remains the primary inspector target (last selected node). Deleting uses React Flow’s selected node **and** edge ids from the event, not only `selectedNodeId`.

**Keyboard:** when the canvas pane has focus (not inspector inputs): Delete and Backspace call `deleteNodes` / `deleteEdges` for the current RF selection.

**`isValidConnection`:** resolve source/target ports via registry + `matchPorts`. If mismatch, return `false`. Do not call `onEdgeError` on hover; call it on a completed `onConnect` that still fails (belt and suspenders).

**`onConnect`:** keep current `addEdge` path.

**Edges:** implement `onEdgesChange` at least for `select`. Removing via RF `remove` change must call `deleteEdges` (or no-op RF remove and only delete via our keyboard/menu — pick **store is truth**: map `remove` changes to `deleteEdges`).

**React Flow:**

- `proOptions={{ hideAttribution: true }}`
- `deleteKeyCode={null}` so RF does not fight our Delete handler (we own delete).
- MiniMap: `nodeColor` callback returns computed `--machina-minimap-node` or fallback `#8a8a8a`. `maskColor` from `--machina-minimap-mask` or `rgba(12,12,12,0.8)`. **Do not** use `#333` on `#0c0c0c`.
- Canvas wrapper background: `var(--machina-canvas-bg, #0c0c0c)` so themes can bind without rewriting connect logic.

**Stub file (ports lane):** create `apps/studio/src/canvas/edge-language.ts`:

```ts
export function flowEdgeStyle(_portType: string): { stroke?: string } {
  return {};
}
```

Canvas sets each flow edge `style` to `flowEdgeStyle(sourcePortType)` looking up the source node’s port type from the registry. Empty style is correct for this lane.

**Context menu** (`CanvasContextMenu.tsx`):

| Target | Items |
|--------|--------|
| Node | Delete, Duplicate, Possess (only if `node.kind === "entities.actor"`) |
| Edge | Delete |
| Pane | no menu |

Possess: if props say there is a **paused** run, call `onPossessNode(id)`. Otherwise status/English: **`Pause a run to possess this actor.`** Do not invent a Think. Do not import the kernel.

**Wiring:** dragging from a source handle to a legal target **must** persist an edge. If QA finds handles unhittable, raise `connectionRadius` on `ReactFlow` first; only then touch `MachinaFlowNode.tsx`.

## 7. English (frozen)

| Situation | Message |
|-----------|---------|
| Possess, no paused run | `Pause a run to possess this actor.` |
| Illegal wire | existing `err.message` from `matchPorts` / `@machina/ui` `portMismatchCopy` (do not rewrite) |

## 8. Tests (required)

Package: `@machina/studio` (and store unit tests without the browser where possible).

1. `deleteNodes` removes node, incident edges, and nested graphs; undo restores ids and wiring.
2. `duplicateNodes` on an actor with a subgraph yields new ids; original graphs unchanged.
3. Undo: two config patches → undo twice returns to start; 51st mutation drops the oldest.
4. Drag: many `dragging: true` positions then `dragging: false` → **one** undo step reverts to pre-drag position.
5. `addEdge` still rejects RESOURCE→PERSONALITY (existing English).
6. `isValidConnection` false for mismatched types (unit test the helper if extracted).
7. Context menu possess without pause: message equals the frozen string (component test).

No network. No real LLM.

## 9. Out of scope

Port colors/symbols, themes, fonts, kind author, copy/paste clipboard, confirm-on-delete, React Flow `pro` paid features other than `hideAttribution`.

# Lane — Studio canvas ops

**Branch:** `master` (in progress; no separate lane worktree)  
**Base:** canvas commits from `1da6da2`  
**Code tip:** `71704b3`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `1da6da2` | feat: add canvas undo delete and duplicate to project store |
| `560ce90` | fix: record undo for addNode addEdge and insertPreset |
| `eda7050` | fix: remap nested cabinet wires on duplicate and delete |
| `11c50d5` | feat: add canvas connection validation helper |
| `13a5368` | feat: wire canvas delete shortcuts minimap and hide attribution |
| `0623ce9` | fix: scope canvas delete to pane and one undo step |
| `2721a47` | feat: add canvas context menu for delete duplicate possess |
| `0cf5471` | fix: wire context-menu possess to paused run stance |
| `71704b3` | fix: dismiss canvas context menu and require possess callback |

**Lane code tip:** `71704b3`

## Test summary

`pnpm --filter @machina/studio test` — **81/81**

| File | Tests |
|------|-------|
| `src/lib/undo-stack.test.ts` | 5 |
| `src/lib/project-store.test.ts` | 23 (delete / duplicate / undo / drag) |
| `src/canvas/is-valid-connection.test.ts` | 3 |
| `src/canvas/edge-language.test.ts` | 2 |
| `src/canvas/minimap.test.ts` | 4 |
| `src/canvas/selection-delete.test.ts` | 8 |
| `src/components/CanvasContextMenu.test.tsx` | 7 |

Workspace `pnpm test`: **160 passed, 1 failed** (161 total). Failure is **not this lane:** `@machina/runtime` `dead-channel-lite.test.ts` → “has no dead-channel scenario hacks in engine or studio” times out at 5s while walking `apps/studio/.next` compiled JS. Studio package tests all pass.

## Deliverables

- `apps/studio/src/lib/undo-stack.ts` — in-memory undo/redo (`EditorSnapshot`, cap 50)
- `apps/studio/src/lib/graph-edit.ts` — `deleteNodesFromProject`, `deleteEdgesFromProject`, `duplicateNodesInProject` (nested graphs, remapped wires)
- `apps/studio/src/canvas/` — `isValidMachinaConnection`, selection-delete key/RF handlers, MiniMap colors, `toFlowNodes` / `toFlowEdges`, `flowEdgeStyle` stub
- `apps/studio/src/components/Canvas.tsx` — pane delete, undo/redo shortcuts, MiniMap, `hideAttribution`, `deleteKeyCode={null}`, `isValidConnection`
- `apps/studio/src/components/CanvasContextMenu.tsx` — node Delete / Duplicate / Possess; edge Delete; possess gated on paused run

# Lane 1a — Compiler Report

**Branch:** `lane/1a-compiler`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-1a`  
**Ownership:** `packages/graph/**`  
**Status:** DONE

## Commits

| Hash | Message |
|------|---------|
| `4817cbd` | feat: compile rejects worlds with no Clock |
| `84383d9` | feat: typecheck edges and emit SimulationPlan |
| `fea8260` | docs: add lane 1a compiler report |

## Test summary

```
pnpm --filter @machina/graph test

 ✓ tests/compile.test.ts (2 tests)
 ✓ tests/compile-edges.test.ts (4 tests)

 Test Files  2 passed (2)
      Tests  6 passed (6)
```

## Deliverables

- `export { compile }` from `@machina/graph`
- `compile(project, registry)` → `{ plan: SimulationPlan }` | `{ errors: MachinaError[] }`
- `flatten.ts` — recurse `subgraphId`, merge child graphs, track portal parent for `actorRef`
- `validate.ts` — kind resolution, `matchPorts`, exclusive-port collisions, wire helpers
- `classify.ts` — nodes into `systems` / `agents` / `perception` / `analysis` (clock only in `plan.clock`)

## Notes

- Subgraph flattening: portal `parentNodeId` → `actorRef` for agents inside actor subgraphs.
- `control.clock` classified only into `plan.clock`, not `plan.systems`.
- Resource → Personality traits port mismatch maps to operator copy via traits-port special case.

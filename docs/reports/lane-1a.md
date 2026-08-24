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

## Test summary

```
pnpm --filter @machina/graph test

 ✓ tests/compile.test.ts (2 tests)
 ✓ tests/compile-edges.test.ts (4 tests)

 Test Files  2 passed (2)
      Tests  6 passed (6)
```

## TDD evidence

### Task 1 — missing Clock + clock-only plan

1. **RED** — Added `tests/compile.test.ts` with empty project (no Clock). `compile` stub missing → test fails to import/run.
2. **GREEN** — Implemented minimal `compile.ts`: `MISSING_CLOCK` via `missingClockCopy()`, clock-only plan with empty `systems/agents/perception/analysis`.
3. **PASS** — 2 tests green.
4. **Commit** — `feat: compile rejects worlds with no Clock`

### Task 2 — validation + SimulationPlan

1. **RED** — Added `tests/compile-edges.test.ts`:
   - unknown kind `nope.thing`
   - version mismatch `cognition.agent@99`
   - Resource.stock → Personality.traits port mismatch
   - full wired fixture (clock/world/actor/personality/goal/memory/perception/agent/system)
2. **GREEN** — Split implementation:
   - `flatten.ts` — recurse `subgraphId`, merge child graphs, track portal parent for `actorRef`
   - `validate.ts` — kind resolution, `matchPorts`, exclusive-port collisions, wire helpers
   - `classify.ts` — `systems` / `agents` / `perception` / `analysis` buckets; clock excluded from systems
   - `compile.ts` — orchestration
3. **PASS** — 6 tests green (2 + 4).
4. **Commit** — `feat: typecheck edges and emit SimulationPlan`

## Deliverables

- `export { compile }` from `@machina/graph`
- `compile(project, registry)` → `{ plan: SimulationPlan }` | `{ errors: MachinaError[] }`
- Dependencies: `@machina/core`, `@machina/node-sdk`, `@machina/plugin-core`, `@machina/ui`
- Vitest script: `"test": "vitest run"`

## Notes

- Subgraph flattening implemented in `flatten.ts` (portal `parentNodeId` → `actorRef` for agents inside actor subgraphs).
- `control.clock` classified only into `plan.clock`, not `plan.systems`.
- Resource → Personality traits (out→out drag) maps to operator copy via traits-port special case in edge validation.

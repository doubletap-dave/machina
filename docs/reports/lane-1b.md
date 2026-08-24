# Lane 1b — World kernel

**Branch:** `lane/1b-kernel`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-1b`  
**Base:** `WAVE0` (tag)

## Status

**COMPLETE** — All lane 1b tasks implemented. `pnpm --filter @machina/simulation test` passes (11 tests, 0 failures).

## Commits

| Commit   | Message |
|----------|---------|
| `af7be56` | feat: add seeded simulation RNG |
| `cc2f4d5` | feat: add seeded turn kernel with interventions and rewind |
| (latest) | feat: construct kernel from SimulationPlan actor refs |

## Test summary

```
Test Files  3 passed (3)
     Tests  11 passed (11)
```

| File | Tests | Coverage |
|------|-------|----------|
| `tests/rng.test.ts` | 2 | Same-seed reproducibility; different seeds diverge |
| `tests/kernel.test.ts` | 7 | Deterministic turns, noisy perception, pause/intervention, rewind, think packet shape, no `TrueWorldState` on index |
| `tests/from-plan.test.ts` | 2 | `actorIdsFromPlan`, `createKernelFromPlan` actor keys |

## Deliverables

| Module | Purpose |
|--------|---------|
| `src/rng.ts` | Mulberry32 `createRng(seed)` — values in `[0, 1)` |
| `src/types.ts` | `TrueWorldState`, `ThinkFn`, `Kernel` (not re-exported from index) |
| `src/kernel.ts` | `createKernel` — tick → perception → think → snapshot; interventions; rewind |
| `src/from-plan.ts` | `actorIdsFromPlan`, `createKernelFromPlan` |
| `src/index.ts` | Public: `createRng`, `createKernel`, `createKernelFromPlan`, `actorIdsFromPlan`, `Kernel`, `ThinkFn` |

## Constraints verified

- No LangGraph; no `@machina/agents` dependency
- `TrueWorldState` exported from `types.ts` only — **not** on package public index
- Intervention requires pause; applied as `kind: "intervention"` event on next `runTurn`
- Perception adds noise (`50 ± 7`) — never copies truth economy into packets

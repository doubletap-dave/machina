# Lane 1d — Persistence Report

**Branch:** `lane/1d-persistence`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-1d`  
**Base:** `WAVE0` (`ec35279`)

## Status

**DONE** — Tasks 1–2 complete. `pnpm --filter @machina/persistence test` passes (4 tests, no Docker).

## Commits

| SHA | Message |
|-----|---------|
| `9e23b72` | feat: save and load Machina project folders |
| `37039af` | feat: add PGlite autosave and run event store |

## Test summary

```
Test Files  2 passed (2)
     Tests  4 passed (4)
```

| Suite | Tests | Notes |
|-------|-------|-------|
| `project-files.test.ts` | 1 | Save/load round-trip with parent + subgraph; positions, edges, configs preserved |
| `db.test.ts` | 3 | Autosave/load; run + 2 events; snapshot at turn 1 |

## Deliverables

| File | Role |
|------|------|
| `src/project-files.ts` | `saveProject` / `loadProject` — `machina.json` + `graphs/<id>.json` |
| `src/schema.ts` | Drizzle table defs + `INIT_STATEMENTS` |
| `src/db.ts` | `createDb(dataDir)` — PGlite file-backed autosave, runs, events, snapshots |
| `src/index.ts` | Public exports |

## Dependencies added

- `@electric-sql/pglite@^0.5.7`
- `drizzle-orm@^0.45.2`
- `@machina/core` (workspace)

## Blockers

None.

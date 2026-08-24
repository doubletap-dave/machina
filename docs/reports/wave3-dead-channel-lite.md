# Wave 3 — Dead Channel Lite

**Status:** COMPLETE  
**Branch:** `master`

## Commits

| Message |
|---------|
| feat: add Dead Channel Lite example project |
| test: prove Dead Channel Lite 20-turn headless run |

## Test summary

```
pnpm --filter @machina/runtime test
→ dead-channel-lite.test.ts: 2 passed (load+compile, 20-turn proof)
```

Full suite: 66/66 (`pnpm test`)

## Deliverables

- `examples/dead-channel-lite/` — `machina.json`, `graphs/*.json`, `build-project.ts` (source for regeneration)
- `apps/runtime/tests/dead-channel-lite.test.ts` — headless 20-turn proof, no truth leakage

## Verification

- Zero `dead-channel` string hacks in `packages/` or `apps/studio`
- `pnpm exec machina run ./examples/dead-channel-lite --turns 20` (CLI)

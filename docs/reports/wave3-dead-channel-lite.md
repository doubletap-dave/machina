# Wave 3 — Dead Channel Lite

**Status:** COMPLETE  
**Branch:** `master` @ `993fef8`

## Commits

| SHA | Message |
|-----|---------|
| `993fef8` | feat: add Dead Channel Lite example and 20-turn headless proof |

## Test summary

| Package | Tests |
|---------|-------|
| `@machina/runtime` | 10/10 (includes 3 dead-channel-lite tests) |
| **Full suite** | **67/67** (`pnpm test`) |

## Deliverables

- `examples/dead-channel-lite/` — `machina.json`, `graphs/*.json` (Atlantic Federation + Vesper Union)
- `apps/runtime/tests/dead-channel-lite.test.ts` — compile, 20-turn truth-isolation proof, hack grep

## Verification

- Zero `dead-channel` scenario hacks in `packages/` or `apps/studio`
- `pnpm exec machina run ./examples/dead-channel-lite --turns 20`

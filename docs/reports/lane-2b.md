# Lane 2b — RUN instrumentation + stances

**Branch:** `lane/2b-run`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-2b`  
**Base:** `WAVE1`  
**Merged to `master`:** `3c7aa10`

## Status

**COMPLETE**

## Commits

| SHA | Message |
|-----|---------|
| `0af4909` | feat: emit run instrumentation from kernel |
| `fd934f4` | feat: add Watch God Possess UI and ANALYZE rewind slider |
| `cc2b41a` | feat: map kernel instrumentation to WebSocket payloads |
| `d98301f` | docs: lane 2b report and AGENTS.md status |

**Lane branch tip:** `d98301f`

## Test summary

| Package | Tests |
|---------|-------|
| `@machina/simulation` | 12/12 |
| `@machina/studio` | 10/10 |
| `@machina/runtime` | 7/7 |

## Deliverables

- `packages/simulation/src/instrument.ts` — `InstrumentMsg`; kernel `onInstrument` emits `turn`
- `apps/studio/src/run/` — `StanceBar`, `PossessPanel`, `AnalyzeTab`, `stance.ts`, `speed.ts`
- `apps/runtime/src/instrumentation.ts` — `toWs` bridge

## Follow-ups (out of scope)

- Wire `onInstrument` through runtime `createApp` WS broadcast
- Integrate RUN components into `StudioShell`

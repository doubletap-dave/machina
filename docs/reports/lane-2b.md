# Lane 2b — RUN instrumentation + stances

**Branch:** `lane/2b-run`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-2b`  
**Base:** `WAVE1` (tag)

## Status

**COMPLETE** — All lane 2b tasks implemented. Package tests pass.

## Commits

| Commit   | Message |
|----------|---------|
| `0af4909` | feat: emit run instrumentation from kernel |
| `fd934f4` | feat: add Watch God Possess UI and ANALYZE rewind slider |
| `cc2b41a` | feat: map kernel instrumentation to WebSocket payloads |

**Branch tip:** `a7847a8`

## Test summary

| Package | Files | Tests |
|---------|-------|-------|
| `@machina/simulation` | 4 passed | 12 passed |
| `@machina/studio` | 3 passed | 10 passed |
| `@machina/runtime` | 3 passed | 7 passed |

### TDD evidence

| Task | Test | Result |
|------|------|--------|
| Kernel instrumentation | `instrument.test.ts` — mocked think, one turn, `onInstrument` receives `{ type: "turn", turn: 1 }` | ✅ |
| `legalPossessTargets` | agent node → `[id]`; container subgraph → cabinet agents; null → all agents | ✅ |
| `delayForSpeed` | 1→1000ms, 10→100ms, 100→10ms | ✅ |
| `PossessPanel` | legal action buttons rendered; `chainOfThought` absent from HTML | ✅ |
| `toWs` | `{ type: "turn", turn: 3 }` maps to identical payload | ✅ |

## Deliverables

| Module | Purpose |
|--------|---------|
| `packages/simulation/src/instrument.ts` | `InstrumentMsg` union type |
| `packages/simulation/src/kernel.ts` | Optional `onInstrument` callback; emits `turn` per `runTurn` |
| `apps/studio/src/run/stance.ts` | `Stance` type, `legalPossessTargets` |
| `apps/studio/src/run/speed.ts` | `delayForSpeed` for 1x/10x/100x mechanical pacing |
| `apps/studio/src/run/StanceBar.tsx` | Watch / God / Possess mode buttons |
| `apps/studio/src/run/PossessPanel.tsx` | Observation facts + legal action buttons (no CoT) |
| `apps/studio/src/run/AnalyzeTab.tsx` | Turn range slider calling `onRewind` |
| `apps/runtime/src/instrumentation.ts` | `toWs(msg)` — kernel `InstrumentMsg` → WS JSON |

## Constraints verified

- Writable paths only — no edits outside lane ownership
- Possess UI renders `legalActions` as buttons; never dumps `chainOfThought`
- `legalPossessTargets` resolves single agent, container subgraph agents, or all project agents
- `AnalyzeTab` range input: `min=0`, `max={maxTurn}`, `onRewind(turn)` on change

## Follow-ups (out of scope)

- Wire `onInstrument` through runtime `createApp` and broadcast `node-active`, `edge-pulse`, `possess-wait` from full kernel loop
- Integrate `StanceBar`, `PossessPanel`, `AnalyzeTab` into `StudioShell` RUN mode
- Add `@machina/simulation` as explicit runtime dependency (currently type-imports via relative path)

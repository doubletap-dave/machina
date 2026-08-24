# Lane 1c — LangGraph cognition

**Status:** DONE

**Branch:** `lane/1c-agents` (worktree: `machina-1c`)

## Commits

| SHA | Message |
|-----|---------|
| `aecb967` | feat: add LangGraph agent think with token usage |
| `84d0875` | feat: add possess interrupt with zero token usage |

## Test summary

```
pnpm --filter @machina/agents test
```

| File | Tests |
|------|-------|
| `tests/graph.test.ts` | think returns action + usage; truth-isolation grep |
| `tests/possess.test.ts` | possessWait interrupt; resumePossess zero usage |

**Result:** 4 passed, 0 failed

## Deliverables

- `packages/agents/src/graph.ts` — `compileAgentGraph`, `createAgentRuntime` (`think`, `possessWait`, `resumePossess`)
- `packages/agents/src/checkpointer.ts` — `createAgentCheckpointer` (MemorySaver), `PgliteCheckpointer` stub
- `packages/agents/src/index.ts` — public exports
- `packages/agents/tests/graph.test.ts`, `possess.test.ts`

## Constraints verified

- Only `packages/agents/**` edited
- No `@machina/simulation` import; no `TrueWorldState` in src (grep test)
- LangGraph `StateGraph` + `MemorySaver`; `think` uses `{ configurable: { thread_id } }`
- Possess V0: in-memory map, no `invoker` on possess path, zero token usage on resume

# Lane 1f — Runtime HTTP/WS/CLI

**Status:** DONE

**Branch:** `lane/1f-runtime` (worktree: `C:\Users\axolatl-tank\Projects\machina-1f`)

## Commits

| SHA | Message |
|-----|---------|
| `2f9a2a3` | feat: add runtime HTTP control plane |
| `24158c5` | feat: add runtime WebSocket and machina CLI |

## Test summary

```
pnpm --filter @machina/runtime test
```

- **6 tests passed** (2 files)
  - `tests/http.test.ts` — compile 400/200, pause-before-god 409, step + GET summary
  - `tests/cli.test.ts` — `machina run --turns 2` prints `turns=2`, `machina test` prints `ok`

## Deliverables

| File | Purpose |
|------|---------|
| `apps/runtime/src/app.ts` | HTTP control plane (`createApp` with injectable deps, in-memory runs) |
| `apps/runtime/src/ws.ts` | WebSocket upgrade on `/ws`, broadcasts `turn` and `event` messages |
| `apps/runtime/src/cli.ts` | `machina run` / `machina test` with injectable `runCli` |
| `apps/runtime/src/index.ts` | Public exports |
| `apps/runtime/tests/http.test.ts` | HTTP route tests via `listen(0)` + `fetch` |
| `apps/runtime/tests/cli.test.ts` | CLI tests via `runCli` |

## Routes implemented

- `POST /compile` → 200 `{ plan }` or 400 `{ errors }`
- `POST /runs` → 200 `{ id }` (fake turn counter when `createKernel` absent)
- `POST /runs/:id/pause|resume|step|stance|interventions|possess/action|rewind`
- `GET /runs/:id` → `{ id, turn, cost: 0, errors: [] }`
- Interventions while running → **409** `"Pause the world before changing it."`

## Notes

- Peer packages (`@machina/graph`, `@machina/simulation`, `@machina/persistence`) are injected via `RuntimeDeps`; tests use mocks.
- `createKernel` optional — step increments an in-memory turn counter for Studio binding before kernel lands.

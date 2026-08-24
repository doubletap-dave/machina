# Machina Lane 1f — Runtime HTTP, WS, CLI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `apps/runtime/**` only. Depend on `@machina/graph`, `@machina/simulation`, `@machina/agents`, `@machina/persistence` as **optional at compile time** via dynamic import. If a package still exports `{}`, skip that route and return 503 `{ message: "Runtime piece not ready." }` — tests mock those modules.

**Goal:** Node server: open/compile/run/pause/step/stance/intervention/possess/rewind + WebSocket events + CLI `machina run`.

**Tech Stack:** Node `http`, `ws` package, TypeScript, Vitest, `supertest` or undici `fetch` against `listen(0)`.

---

### Task 1: HTTP control plane with mocks

**Files:**
- Modify: `apps/runtime/package.json`
- Create: `apps/runtime/src/app.ts`, `apps/runtime/src/index.ts`, `apps/runtime/tests/http.test.ts`

**Interfaces:**

```ts
export function createApp(deps: {
  compile: typeof import("@machina/graph").compile | ((p: unknown) => { errors: { message: string }[] });
  createKernel?: typeof import("@machina/simulation").createKernel;
  saveProject?: typeof import("@machina/persistence").saveProject;
  loadProject?: typeof import("@machina/persistence").loadProject;
}): { fetch(req: Request): Promise<Response> } | import("http").Server;
```

Prefer `node:http` Server. Routes (JSON):

- `POST /compile` body `MachinaProject` → 200 `{ plan }` or 400 `{ errors }`
- `POST /runs` body `{ project, seed, stance?: "watch"|"god"|"possess", possessNodeId?: string }` → 200 `{ id }`
- `POST /runs/:id/pause` → 200
- `POST /runs/:id/resume` → 200
- `POST /runs/:id/step` → 200 `{ turn }`
- `POST /runs/:id/stance` body `{ mode, nodeId?: string }` → 200
- `POST /runs/:id/interventions` → 409 `{ message: "Pause the world before changing it." }` if not paused; 200 if paused
- `POST /runs/:id/possess/action` body `AgentAction` → 200
- `POST /runs/:id/rewind` body `{ turn: number }` → 200
- `GET /runs/:id` → `{ id, turn, cost: 0, errors: [] }`

In-memory `Map` of runs. If `createKernel` missing, `/runs` still returns an id and step increments a fake turn counter so studio can bind.

- [ ] **Step 1: Tests with mock `compile` that returns `{ errors: [{ message: "This world needs a Clock before it can run." }] }` → POST /compile 400. Mock compile success → 200. POST /runs then pause then intervention 200; intervention without pause 409.**

- [ ] **Step 2: Implement + PASS + commit** `feat: add runtime HTTP control plane`

---

### Task 2: WebSocket + CLI

**Files:**
- Create: `apps/runtime/src/ws.ts`, `apps/runtime/src/cli.ts`, `apps/runtime/tests/cli.test.ts`
- Modify: `package.json` `"bin": { "machina": "./src/cli.ts" }` (tsx or node with ts)

**Interfaces:**

WS messages JSON: `{ type: "turn", turn: number } | { type: "event", event: MachinaEvent } | { type: "possess-wait", nodeId: string, packet: ObservationPacket } | { type: "error", message: string }`

CLI: `machina run <dir> --turns 20` loads project (mock loadProject in test), steps 20, exits 0, prints `turns=20`. `machina test` exits 0 and prints `ok` (placeholder until Wave 3).

- [ ] **Step 1: CLI test: spawn or call `runCli(["run", dir, "--turns", "2"], { loadProject, step })` and expect `turns=2`.**

- [ ] **Step 2: Implement CLI + WS attach on the same HTTP server upgrade `/ws`. Commit** `feat: add runtime WebSocket and machina CLI`

---

Lane 1f done when HTTP tests pass and CLI run prints turn count.

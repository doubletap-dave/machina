# Models and credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GUI-managed BYO keys (Anthropic, OpenAI, OpenRouter, Perplexity), live list-models as key test, machine default + per-agent override, and **real** `createLlmThink` so Play/CLI/Describe call a chat model. Tests never hit the network.

**Architecture:** `%USERPROFILE%\.machina\credentials.json` (user ACL). Runtime HTTP is the only browser door. Env overrides keys without writing the file. `opts.think` in tests wins.

**Tech Stack:** Node 22, Vitest, Zod, LangChain chat packages `@latest`, existing runtime HTTP.

**Spec:** `docs/superpowers/specs/2026-08-24-models-and-credentials-design.md`  
**Lane:** `lane/studio-models`

## Global Constraints

- LLMs run un-possessed Think. No mock chat model in `packages/engine/src`.
- GET settings JSON must never contain `apiKey`.
- Do not put keys in the world folder or `localStorage`.
- Remove product default `model: "mock"` from agent schema.
- Frozen English in `@machina/core` `llm-english.ts`. Do not change `InstrumentMsg`.
- Do not edit Canvas / port-language / kind-manifest.
- `pnpm add <pkg>@latest` from `packages/engine` for LangChain providers.
- Injectable `fetch` and chat invoker for tests.

---

### Task 1: English + credentials file

**Files:**
- Create: `packages/core/src/llm-english.ts` + tests + export from `index.ts`
- Create: `packages/engine/src/credentials.ts`
- Create: `packages/engine/tests/credentials.test.ts`

Path `join(homedir(), ".machina", "credentials.json")`. `homedir` injectable. `publicProviderView` strips `apiKey`. `restrictToOwner` best-effort (chmod 0600; Windows ACL if easy, else chmod).

- [x] **Step 1: Tests** save/load round-trip; public view has no `apiKey`; corrupt JSON → `credentialsUnreadableCopy()`; `last4` of `sk-ant-1234abcd` is `abcd`.

- [x] **Step 2: Implement. PASS. Commit** `feat: add machine credential store for llm providers`

---

### Task 2: List-models verify

**Files:**
- Create: `packages/engine/src/list-models.ts`
- Create: `packages/engine/tests/list-models.test.ts`

`listAndVerify(provider, apiKey, fetchImpl)` uses spec URLs/headers. 401 → `{ ok: false, message: keyRefusedCopy() }`. 200 → `{ ok: true, models: [{ id, name }] }`.

- [ ] **Step 1: Tests** with stub fetch (no network): 401 and 200 Anthropic-shaped and OpenAI-shaped bodies.

- [ ] **Step 2: Implement four providers. PASS. Commit** `feat: verify provider keys by listing models`

---

### Task 3: Runtime settings HTTP + client

**Files:**
- Create: `apps/runtime/src/settings.ts`
- Modify: `apps/runtime/src/app.ts`
- Modify: `apps/runtime/tests/http.test.ts`
- Modify: `packages/client/src/client.ts` + client tests

Routes exactly as spec. `PUT` saves key then list-models (inject fetch). Failed verify still saves key, `verifiedAt` null. `DELETE` clears default if it pointed at that provider. `PUT /settings/default` requires verified + model in cache.

- [ ] **Step 1: Tests** GET after PUT never includes `apiKey` (`JSON.stringify(body).includes("apiKey") === false`). 401 stub → `This key was refused.` Env `OPENAI_API_KEY` → configured without writing file (mock env in test).

- [ ] **Step 2: Implement. PASS. Commit** `feat: add runtime http for llm settings`

---

### Task 4: Kill mock agent model + createLlmThink

**Files:**
- Modify: `plugins/core/src/kinds/schemas.ts` — `llmProvider` / `llmModel` optional; **delete** `model: z.string().default("mock")`
- Modify: plugin-core tests that expect `"mock"`
- Modify: `plugins/core/src/presets/nation.ts` — stop writing `model: "mock"`
- Create: `packages/engine/src/llm-think.ts`
- Create: `packages/engine/tests/llm-think.test.ts`
- Modify: `packages/engine/src/engine.ts` — if `opts.think` omitted, `createLlmThink` from credentials + agent configs; tests that pass `think` unchanged
- Modify: `apps/runtime/src/serve.ts` / CLI — do not pass a stub think

`createLlmThink({ invokeChat, credentials, agentConfig })` where tests pass `invokeChat` that returns JSON. Production `invokeChat` uses LangChain `@latest` (Anthropic, OpenAI; OpenRouter/Perplexity OpenAI-compatible baseURLs from spec).

Illegal JSON or type not in `legalActions` → throw `illegalModelActionCopy()` (engine pauses).

Incomplete override → `agentLlmIncompleteCopy()`.

- [ ] **Step 1: Test** `agentConfigSchema.parse({})` has no `model: "mock"`. Stub invoke returns `{ type: "wait", params: {} }` and packet.legalActions includes `wait` → that action. Bad JSON → frozen illegal copy. Injected engine `think` is used (spy list-models not called).

- [ ] **Step 2: `pnpm add` LangChain packages from `packages/engine`. Implement. PASS. Commit** `feat: real chat-model Think path in engine`

---

### Task 5: Configuration page + inspector + Describe

**Files:**
- Create: `apps/studio/src/lib/filter-models.ts` + test (`"sonnet"` matches `claude-sonnet-4-5`)
- Create: `apps/studio/src/components/ConfigurationPage.tsx`
- Modify: `StudioShell.tsx` — mode `configure`, sentence-case **Configure**
- Modify: `Inspector.tsx` — agent selects; `Use machine default`
- Modify: `DescribePanel.tsx` — `GET /settings/models`; no `process.env`; `POST /compose` when default set
- Add `POST /compose` in runtime using default LLM proposer + existing `composeFromDescription`
- Delete or stop using `apps/studio/src/lib/model-configured.ts` env sniff

GUI: Save / Remove / Refresh per provider; last4; filter; Set as default.

- [ ] **Step 1: Tests** Describe without default → `No language model is configured. Build by hand or set an API key.` Filter helper. Client methods mocked.

- [ ] **Step 2: Implement. PASS. Commit** `feat: add studio configuration page and real describe proposer`

---

### Task 6: Lane report

- [ ] `pnpm test`. Grep engine `src` for mock chat models — none. `docs/reports/lane-studio-models.md`. Update `AGENTS.md` commands if any. Commit `docs: models-and-credentials lane report`

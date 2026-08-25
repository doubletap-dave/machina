# Lane — Models and credentials

**Branch:** `master` (no separate lane worktree)  
**Lane:** `lane/studio-models`  
**Spec:** `docs/superpowers/specs/2026-08-24-models-and-credentials-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-24-models-and-credentials.md`  
**Code tip:** `2c23ff7`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `70cae15` | feat: add machine credential store for llm providers |
| `7464915` | feat: verify provider keys by listing models |
| `5114c25` | feat: add runtime http for llm settings |
| `77185e7` | feat: real chat-model Think path in engine |
| `1cf18e4` | feat: add studio configuration page and real describe proposer |
| `2c23ff7` | fix: allow compose when env key is verified |

## Test summary

Grep of `packages/engine/src` for mock chat models: **none**.

| Package | Tests |
|---------|-------|
| `@machina/engine` | **33/33** |
| `@machina/runtime` | **26/26** |
| `@machina/client` | **10/10** |
| `@machina/plugin-core` | **5/5** |
| `@machina/studio` | **99/99** |

Commands:

```
pnpm --filter @machina/engine test     # 33/33
pnpm --filter @machina/runtime test    # 26/26
pnpm --filter @machina/client test     # 10/10
pnpm --filter @machina/plugin-core test # 5/5
pnpm --filter @machina/studio test     # 99/99
```

Models coverage: `credentials.test.ts` (4), `list-models.test.ts` (10), `llm-think.test.ts` (8), engine default-Think (1), `settings.test.ts` (8), `compose.test.ts` (3), client settings + compose (10 total), `filter-models.test.ts` (2), `ConfigurationPage.test.tsx` (4), `DescribePanel.test.tsx` (2), Inspector agent LLM (1). Studio total includes canvas-ops / port-language / presets tests not owned by this lane.

## Spec gap (compose vs env verify)

`POST /compose` originally required `file.providers[].verifiedAt`. Env-only keys verify into the settings in-memory cache (`verified: true` on `GET /settings/models`) and are never written to `credentials.json`.

**Fix:** compose uses the same `providerView` as GET (env overlay + in-memory verify cache). If GET would say the default provider is verified, compose may use it.

**TDD:** `allows compose when an env key is verified without file verifiedAt` — `OPENAI_API_KEY` injected, refresh + default, stub `invokeChat`. RED: 400 because file had no `verifiedAt`. GREEN: 200 after sharing `settings.providerView`.

## Deliverables

- `packages/core/src/llm-english.ts` — frozen Think/config copy (`keyRefusedCopy`, `describeNoLlmCopy`, …)
- `packages/engine/src/credentials.ts` — path `join(homedir(), ".machina", "credentials.json")`; load/save; `restrictToOwner`; env overlay (`OPENAI_API_KEY` etc.); `publicProviderView` strips `apiKey`
- `packages/engine/src/list-models.ts` — `listAndVerify` (injectable `fetch`; no network in tests)
- `packages/engine/src/llm-think.ts` — `createLlmThink`; production `langchainInvokeChat` (Anthropic / OpenAI / OpenRouter / Perplexity). `openEngine` / `openEngineFromProject` use it when `opts.think` is omitted. Tests that pass `think` unchanged.
- `apps/runtime/src/settings.ts` — `GET/PUT/DELETE /settings/*`; env overlay; in-memory verify cache for env-only keys; GET never includes `apiKey`
- `apps/runtime/src/compose.ts` — `POST /compose` default-LLM proposer + `composeFromDescription`; verified view shared with GET
- `packages/client/src/client.ts` — `getSettings`, `putProviderKey`, `deleteProvider`, `refreshProvider`, `putDefault`, `compose`
- `apps/studio/src/components/ConfigurationPage.tsx` — Configure mode; four provider panels; Save / Remove / Refresh; filter; Set as default
- `apps/studio/src/components/DescribePanel.tsx` — `GET /settings/models`; no `process.env`; `POST /compose` when default set
- `apps/studio/src/components/Inspector.tsx` — agent `llmProvider` / `llmModel` (omit both = machine default)
- `plugins/core/src/kinds/schemas.ts` — no product default `model: "mock"`; optional `llmProvider` / `llmModel`

Production runtime (`serve.ts`) does not inject `think`; engine falls through to `createLlmThink`.

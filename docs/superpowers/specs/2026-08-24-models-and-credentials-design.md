# Machina — Models, credentials, and real Think

Date: 2026-08-24  
Status: Approved  
Coordinator: `2026-08-24-studio-operator-surface-design.md`  
Lane: `lane/studio-models`  
Parent: this **is** engine-and-studio Task 11 (real LLM Think) plus Describe’s real proposer. Tests may inject `ThinkFn`. Shipped Run, CLI, and Describe **must not**.

**LLMs run the world.** Every un-possessed `cognition.agent` Think is a live chat-model call. Missing or failed model: English, pause, no invented action, no half-turn.

## 1. Goal

A Studio **Configuration** page manages BYO keys for Anthropic, OpenAI, OpenRouter, and Perplexity. The same store feeds **runtime, CLI, and engine**. List-models is the key test. Filter the catalog. Default provider+model on the machine; per-agent override in the project (ids only). Play actually calls the model.

## 2. Lane ownership

**Write**

- `packages/core/src/llm-english.ts` — frozen Think/config copy (engine must not import `@machina/ui`)
- `packages/engine/src/credentials.ts` — path, load/save, ACL, env override, last4
- `packages/engine/src/list-models.ts` — per-provider list+verify (injectable `fetch`)
- `packages/engine/src/llm-think.ts` — `createLlmThink`
- `packages/engine/src/engine.ts` — default Think from credentials when `opts.think` omitted
- `packages/engine/package.json` — LangChain chat packages `@latest`
- `apps/runtime/src/settings.ts` — HTTP handlers
- `apps/runtime/src/app.ts` — routes below
- `apps/runtime/src/serve.ts` / CLI — wire `createLlmThink`
- `packages/client/src/client.ts` — settings methods
- `apps/studio/src/components/ConfigurationPage.tsx`
- `apps/studio/src/components/StudioShell.tsx` — `Configure` chrome
- `apps/studio/src/components/DescribePanel.tsx` — real proposer via runtime; drop `process.env` sniff
- `apps/studio/src/lib/model-configured.ts` — delete or replace with client `GET /settings/models`
- `apps/studio/src/components/Inspector.tsx` — agent provider/model override only (do not rewrite kind-author field generation; if that lane added a generic form, add agent LLM fields beside it)
- `plugins/core/src/kinds/schemas.ts` — kill product default `"mock"`

**Must not edit**

- `Canvas.tsx`, `MachinaFlowNode.tsx`, port-language map, theme CSS, kind-manifest, persistence `kinds/` I/O
- `InstrumentMsg` shape (frozen)
- Plugin kind **ids**

**May start in parallel with canvas-ops.** Collision with kind-author: `Inspector.tsx` and `StudioShell.tsx`. This lane owns Configuration + agent LLM fields; kind-author owns New kind. Merge by keeping both.

## 3. Credential store

Path: `join(homedir(), ".machina", "credentials.json")`.

After every write: Unix `chmod 0600`; Windows ACL = current user only (`icacls` / `fs` as implemented in `restrictToOwner(path)`). Never commit this file. Never write it into a project folder.

```ts
export type ProviderId = "anthropic" | "openai" | "openrouter" | "perplexity";

export type CachedModel = { id: string; name: string };

export type ProviderRecord = {
  apiKey: string;
  last4: string;
  verifiedAt: string | null; // ISO-8601, set only after list-models 2xx
  models: CachedModel[];
};

export type CredentialsFile = {
  schemaVersion: 1;
  default: { provider: ProviderId; model: string } | null;
  providers: Partial<Record<ProviderId, ProviderRecord>>;
};
```

`last4` = last four characters of the key (if shorter, the whole key is last4 only on disk; **GET still returns last4, never the full key**).

**Env override (does not write the file):**

| Provider | Env |
|----------|-----|
| anthropic | `ANTHROPIC_API_KEY` |
| openai | `OPENAI_API_KEY` |
| openrouter | `OPENROUTER_API_KEY` |
| perplexity | `PERPLEXITY_API_KEY` |

If env is set, that provider is `configured: true`. Verify still requires a successful list (or the last cached `verifiedAt` if Refresh has not been clicked this process — **first use of an env-only key lists once and caches in memory**; do not persist env keys to the file).

Corrupt JSON: treat as empty file, English on GET: `Machina couldn't read the credentials file. Fix or remove ~/.machina/credentials.json.`

## 4. List-models = key test

Injectable `fetch`. Tests pass a stub. CI **never** calls a real provider.

| Provider | List URL | Auth |
|----------|----------|------|
| anthropic | `GET https://api.anthropic.com/v1/models` | `x-api-key`, `anthropic-version: 2023-06-01` |
| openai | `GET https://api.openai.com/v1/models` | `Authorization: Bearer` |
| openrouter | `GET https://openrouter.ai/api/v1/models` | `Authorization: Bearer` |
| perplexity | `GET https://api.perplexity.ai/v1/models` | `Authorization: Bearer` |

Parse OpenAI-shaped `{ data: { id, ... }[] }` or Anthropic `{ data: { id, display_name? }[] }`. `name` = `display_name ?? id`.

- 401/403 → do not set `verifiedAt`. English: `This key was refused.` Key **is still saved** so the operator can edit it in the GUI.
- Other HTTP/network → `Couldn't reach {provider}. Try again.`
- 2xx → cache `models`, set `verifiedAt` to `new Date().toISOString()`.

If Perplexity’s list endpoint is unauthenticated (200 with no key): on **Save** only, also `POST https://api.perplexity.ai/chat/completions` with `max_tokens: 1` and a one-word user message. 401/403 → refused. Do not use this probe on page open or Refresh if the list already required auth.

**Refresh:** list again with the stored (or env) key; replace cached `models`.

**Filter:** Studio-only, case-insensitive substring on `id` and `name`. Does not hit the network.

## 5. HTTP (runtime)

All JSON. Studio uses `@machina/client` only.

| Method | Body | Response |
|--------|------|----------|
| `GET /settings/models` | — | `{ default, providers: { [id]: { configured, verified, last4, models } } }` — **no apiKey** |
| `PUT /settings/providers/:id` | `{ apiKey: string }` | same public provider slice; 400 English if id unknown or key empty |
| `DELETE /settings/providers/:id` | — | 204; removes key+cache for that id; if `default.provider` was that id, `default` becomes `null` |
| `POST /settings/providers/:id/refresh` | — | public slice; 400 if no key |
| `PUT /settings/default` | `{ provider, model }` | 400 if that provider is not verified or `model` not in that provider’s cached list |
| `POST /compose` | `{ prompt: string, project: MachinaProject }` | compose gate using **default** LLM as proposer; 400 English if no verified default |

`GET` never includes `apiKey`. `PUT` key is write-only.

## 6. Configuration page (Studio)

Chrome: sentence-case **Configure** next to Build / Run / Analyze (fourth mode). Full page, not a modal.

Four panels: Anthropic, OpenAI, OpenRouter, Perplexity. Each:

- Password input (empty placeholder if configured: `Key ••••{last4}`)
- **Save** → `PUT` (replace key)
- **Remove** → `DELETE` (no canvas-style undo; this is the secret)
- **Refresh** → `POST …/refresh`
- Badge: verified / not verified
- Filter text field + scrollable model list
- Clicking a model sets it as **this provider’s candidate**; **Set as default** calls `PUT /settings/default`

Machine default shown at the top: `{provider} / {model}` or *“No default model. Save a key and pick one.”*

## 7. Per-agent override

`cognition.agent` config (plugin-core). **Remove** `model: z.string().default("mock")`. Product must not default to a fake model id.

```ts
llmProvider: z.enum(["anthropic", "openai", "openrouter", "perplexity"]).optional()
llmModel: z.string().min(1).optional()
```

Both omitted → machine default. If one is set, **both** must be set or Run/Think English: `This agent needs both a provider and a model, or neither to use the default.`

Stored in the **project** (not credentials). Keys never in the project.

Inspector: two selects when kind is `cognition.agent`. Options for models come from `GET /settings/models` cache for the chosen provider. First option: `Use machine default`.

Existing nodes with `config.model === "mock"`: treat as unset (ignore the field). Do not write `mock` into new nodes. **Presets** (`nationPreset` etc.) must stop emitting `model: "mock"` — omit LLM fields so they use the machine default.

## 8. `createLlmThink` (the product path)

When `openEngine` / `openEngineFromProject` / runtime / CLI start a run **without** `opts.think`:

1. Load credentials. If no verified default and the graph has any `cognition.agent` that is not possessed the whole run — still allow start; the **first Think** emits existing `NO_LLM` English and pauses. Possess still works.
2. `createLlmThink({ credentials, agentConfig: Record<nodeId, { llmProvider?, llmModel? }> })` returns `ThinkFn`.
3. Resolve model: agent override if complete, else `credentials.default`. If still missing → `NO_LLM` (existing string).
4. Call the provider chat model (LangChain `@latest`: Anthropic SDK, OpenAI SDK; OpenRouter and Perplexity = OpenAI-compatible `baseURL` `https://openrouter.ai/api/v1` and `https://api.perplexity.ai`).
5. Prompt: the observation packet JSON + instruction to reply with JSON only `{ "type": string, "params": object }` where `type` is one of `packet.legalActions`.
6. Parse. If `type` not in `legalActions` or JSON invalid → English `The model did not return a legal action.` emit error instrument, pause, **do not** commit a half-turn (engine already pauses on throw).
7. Return `{ actorId: packet.actorId, type, params }`.

`opts.think` in tests **wins** and must not call the network.

Usage: add tokens into `getSummary().cost` only if a real USD rate is known from the provider payload; otherwise leave `cost` at `0`. Do **not** invent `$0.47`. Do not add fields to `InstrumentMsg`.

## 9. Describe

`DescribePanel` must not read `process.env`. `GET /settings/models`: if `default` is null, English `No language model is configured. Build by hand or set an API key.` Else `POST /compose` with the prompt and current project. Runtime proposer is the **same default chat model**, asking for a `MachinaProject` JSON using **registered kind ids only**, then existing `composeFromDescription` compile+smoke loop. Invalid proposals are not saved.

## 10. Frozen English (`@machina/core` `llm-english.ts`)

| Function / existing | String |
|---------------------|--------|
| existing `NO_LLM` | `No language model is configured. Possess the agent or set an API key.` |
| Describe missing | `No language model is configured. Build by hand or set an API key.` |
| `keyRefusedCopy()` | `This key was refused.` |
| `providerUnreachableCopy(provider)` | `Couldn't reach {provider}. Try again.` |
| `illegalModelActionCopy()` | `The model did not return a legal action.` |
| `agentLlmIncompleteCopy()` | `This agent needs both a provider and a model, or neither to use the default.` |
| `credentialsUnreadableCopy()` | `Machina couldn't read the credentials file. Fix or remove ~/.machina/credentials.json.` |
| `noDefaultModelCopy()` | `No default model. Save a key and pick one.` |

## 11. Tests (required, no network)

1. `restrictToOwner` + save/load round-trip; GET-shaped public view strips `apiKey`.
2. Stub fetch 401 → `verifiedAt` null, key still on disk, message `This key was refused.`
3. Stub fetch 200 → models cached, `verifiedAt` set.
4. Env `OPENAI_API_KEY` makes `configured` true without writing the file.
5. `createLlmThink` with stub chat: legal JSON action in `legalActions` → that action; bad JSON → `illegalModelActionCopy`.
6. Engine `start` with injected `think` never calls list-models.
7. Runtime `GET /settings/models` JSON has no `apiKey` key anywhere (`JSON.stringify` grep).
8. Agent schema: parse `{}` has no `model: "mock"`.
9. Describe without default: frozen English, no compose.
10. Filter helper: `"sonnet"` matches id `claude-sonnet-4-5` and name `Claude Sonnet`.

## 12. Out of scope

Machina-hosted billing, extra providers, streaming tokens in the UI, changing `InstrumentMsg`, mock chat models in `packages/engine/src` (tests only).

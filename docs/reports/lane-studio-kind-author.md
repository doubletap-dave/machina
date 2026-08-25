# Lane — Kind author

**Branch:** `master` (no separate lane worktree)  
**Lane:** `lane/studio-kind-author`  
**Spec:** `docs/superpowers/specs/2026-08-24-kind-author-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-24-kind-author.md`  
**Code tip:** `176c7dd`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `b6c0671` | feat: add kind manifest types hash and english copy |
| `bb2f119` | feat: convert kind manifests into node definitions |
| `8bfe0ad` | feat: persist pinned project kinds beside graphs |
| `e090591` | feat: refuse engine start when authoring kinds lack runtime |
| `176c7dd` | feat: add studio kind author and user kind library |

## Test summary

`runtime: "none"` (personality) still starts. Authoring kinds omit `runtime`; compile may succeed; `engine.start` / `POST /runs` refuse with `kindNoRuntimeCopy`.

| Package | Tests |
|---------|-------|
| `@machina/core` | kind hash + english (existing core suite) |
| `@machina/node-sdk` | **7/7** (includes enum-empty guard) |
| `@machina/persistence` | kinds I/O (existing persistence suite) |
| `@machina/engine` | **37/37** (compile custom.foo, start refused, starter still starts) |
| `@machina/runtime` | **27/27** (compile OK then start 400 KIND_NO_RUNTIME) |
| `@machina/client` | **10/10** (`compile(project, kinds)` wrapped body) |
| `@machina/ui` | **10/10** (kind english re-exports) |
| `@machina/studio` | **112/112** |

Commands:

```
pnpm --filter @machina/node-sdk test   # 7/7
pnpm --filter @machina/engine test     # 37/37
pnpm --filter @machina/runtime test    # 27/27
pnpm --filter @machina/studio test     # 112/112
```

## Deliverables

- `packages/core` — `KindManifest` / `KindField`; `canonicalKindJson` + `kindHash` (`crypto.subtle`); frozen `kindNoRuntimeCopy`, pin copy, `kindIdReservedCopy`
- `packages/node-sdk/src/from-manifest.ts` — `kindManifestToDefinition` omits `runtime`; empty enum options do not call `z.enum([])`
- `packages/persistence` — `saveProject(dir, project, kinds?)`; `loadKindManifests`; `verifyProjectKinds`; `kindPins` on `ProjectMeta`; `loadProject` still returns `MachinaProject`
- `packages/engine` — `OpenEngineOpts.kinds`; `openEngine(dir)` loads + verifies kinds; start refuses missing runtime
- Studio Library **New kind**; `KindAuthorForm`; Inspector fields from `KindField[]`; store `upsertKind` + pins; drop edges when a port is removed
- User library `~/.machina/kinds` (`kind-library.ts`, injectable homedir); confirm `Replace the library copy of this kind?`; banner `A newer library copy of {name} exists.`
- `POST /compile` accepts `{ project, kinds }` (raw project still works); `POST /runs` passes `kinds` into `openEngineFromProject`; start errors surface as 400 English, not 500
- `MachinaClient.compile(project, kinds?)`

## Invariants

- No `runtime` key on disk manifests. `runtime: "none"` ≠ omitted runtime.
- Reserved ids (`entities.actor`, …) refuse with `kindIdReservedCopy()`.
- Keys never live in the world folder. Library is machine-local, not used by `openEngine(dir)`.

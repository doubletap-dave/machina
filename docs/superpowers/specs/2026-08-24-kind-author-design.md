# Machina — Kind author (project kinds + library + pin)

Date: 2026-08-24  
Status: Approved  
Coordinator: `2026-08-24-studio-operator-surface-design.md`  
Lane: `lane/studio-kind-author`  
Depends on: none for engine/persistence/core. Studio UI may land in parallel with canvas-ops if it **does not edit** `Canvas.tsx` / `MachinaFlowNode.tsx`.  
Must not wait on: port language, themes (card color is a hex on the kind, not a theme token).

## 1. Goal

Operators define a **kind** in Studio (id, name, category, card color, ports, inspector fields) and save it in the **world folder**. They can **publish a copy** to a machine-local library. The project **pins a hash**. Compile validates wiring. **Run refuses** until a plugin implements `runtime`. No fake inert ticks.

## 2. Lane ownership

**Write**

- `packages/core/src/kind-manifest.ts` (new) + export from `packages/core/src/index.ts`
- `packages/core/src/kind-hash.ts` (canonical JSON + sha256 hex)
- `packages/core/src/kind-english.ts` (new) — `kindNoRuntimeCopy`, `kindPinMismatchCopy`, `kindUnpinnedFileCopy`, `kindPinMissingFileCopy`, `kindIdReservedCopy`
- `packages/core` tests for hash stability and copy strings
- `packages/node-sdk/src/from-manifest.ts` — `kindManifestToDefinition(manifest): NodeDefinition`
- `packages/node-sdk` tests
- `packages/persistence/src/project-files.ts` — `kinds/` + `kindPins` on meta
- `packages/persistence` tests
- `packages/engine/src/engine.ts` — registry merge + `start` refusal
- `packages/engine` tests
- `packages/ui/src/english.ts` — re-export core kind copy functions (Studio keeps importing `@machina/ui` for operator strings)
- `apps/studio/src/kinds/**` (author form, library publish/add, pin banner)
- `apps/studio/src/components/Library.tsx` — “New kind”, custom kinds in groups
- `apps/studio/src/components/Inspector.tsx` — generate fields from `KindField[]` when the selected node’s kind is a manifest kind
- `apps/studio/src/lib/project-store.ts` — **kinds array + pins in memory**; add/update/delete kind files as store operations. **Allowed** even though canvas-ops also edits this file: **kinds lane only adds kinds/pin APIs**; if canvas-ops has not merged, rebase and **do not rewrite** undo/delete. If both land, merge by keeping both APIs.

**Must not edit**

- `Canvas.tsx`, `MachinaFlowNode.tsx`, `port-language.ts`, theme CSS
- Plugin-core kind **implementations** (do not change personality `runtime: "none"` to missing)
- `matchPorts` rules
- Scenario-named branches

**Must not add** `PortType` values.

## 3. Why `runtime` omitted ≠ `runtime: "none"`

Today `NodeDefinition.runtime` is optional. Plugin kinds such as personality use `runtime: "none"` and **are allowed to run** (compile classifies them `skip`; they still shape the graph).

Authoring kinds register with **`runtime` omitted** (or explicit `undefined` after `kindManifestToDefinition`).

| `runtime` | Compile | `engine.start` |
|-----------|---------|----------------|
| `"none"` | skip bucket (today) | **allowed** |
| `"agent"` / `"mechanical"` / `"actor"` | today | **allowed** (subject to LLM rules) |
| `undefined` (authoring) | skip bucket (ports still validated) | **refused** |

Do **not** treat missing runtime as `"none"`.

Frozen strings live in `@machina/core` (`kind-english.ts`). Engine imports core (not `@machina/ui`). Studio may import the same functions via `@machina/ui` re-exports.

```ts
kindNoRuntimeCopy(name, id)
// "{name} ({id}) has no simulation yet. Ship a plugin or remove it from the graph."

kindPinMismatchCopy()
// "This kind file does not match the pin. Restore the file or accept a new pin."

kindUnpinnedFileCopy()
// "This folder has a kind file that is not pinned."

kindPinMissingFileCopy()
// "This project pins a kind that is missing from the folder."

kindIdReservedCopy()
// "That id is reserved by a built-in kind."
```

Codes: `KIND_NO_RUNTIME`, `KIND_PIN_MISMATCH`, `KIND_UNPINNED_FILE`, `KIND_PIN_MISSING_FILE`, `KIND_ID_RESERVED`. If several kinds are missing runtime, return **one error per kind** (stable sort by id).

## 4. `KindManifest` (frozen JSON)

File: `<project>/kinds/<id>.json` — filename is the kind id (already `[a-z0-9.-]`), e.g. `custom.radio-desk.json`.

```ts
export type KindFieldType = "string" | "number" | "boolean" | "enum";

export type KindField = {
  key: string;          // /^[a-z][a-z0-9]*$/
  label: string;
  type: KindFieldType;
  default?: string | number | boolean;
  options?: string[];   // required iff type === "enum"; ignored otherwise
};

export type KindManifest = {
  schemaVersion: 1;
  id: string;           // /^custom\.[a-z0-9]+(?:-[a-z0-9]+)*$/
  version: number;      // integer >= 1
  name: string;
  category: "Actors" | "World" | "Behavior" | "Systems" | "Output";
  cardColor: string;    // /^#[0-9a-f]{6}$/
  ports: Record<string, PortDef>; // existing PortDef; types must be frozen PortType
  fields: KindField[];
};
```

No `runtime` key on disk. `kindManifestToDefinition` sets `metadata: { name, category }`, `type: id`, `configSchema` from fields (Zod object, `.strict()` not required), **omits `runtime`**.

Id must not equal any plugin-core `defineNode` `type` (list those types in a test against `registerCoreKinds`).

## 5. Hash pin

`canonicalKindJson(manifest: KindManifest): string` — recursively sort object keys, then `JSON.stringify` (no extra whitespace).

`kindHash(manifest: KindManifest): Promise<string>` — 64-char lowercase hex SHA-256 of UTF-8 bytes of `canonicalKindJson`, using `globalThis.crypto.subtle.digest` (Node 22 and the browser). Do not use `node:crypto` in `@machina/core` (Studio is a browser).

`machina.json` `ProjectMeta`:

```ts
kindPins?: Array<{ id: string; version: number; hash: string }>
```

Missing `kindPins` on old folders ≡ `[]`. `saveProject(dir, project, kinds: KindManifest[] = [])` writes `kinds/*.json` (create `kinds/` only when `kinds.length > 0` or pins exist) and persists pins. Extra files in `kinds/` not listed in pins: **do not throw from `loadProject`**. New **`verifyProjectKinds(dir, pins)`** returns `MachinaError[]` (`KIND_UNPINNED_FILE`, `KIND_PIN_MISSING_FILE`, `KIND_PIN_MISMATCH`). `loadProject` **return type stays `Promise<MachinaProject>`** (Wave 0). New **`loadKindManifests(dir): Promise<KindManifest[]>`** reads `kinds/*.json` (empty if the folder is missing).

Engine `openEngine(dir)`: `loadProject` + `loadKindManifests` + `verifyProjectKinds`; if verify errors, compile/start surfaces them as English (no stacks in Studio).

**Accept a new pin** (Studio): recompute hash from the file on disk, write `kindPins`, operator-initiated only.

## 6. User library

Directory: `join(homedir(), ".machina", "kinds")` (`node:os` `homedir()` — Windows `%USERPROFILE%\.machina\kinds`).

- **Publish:** copy the project’s `KindManifest` JSON to `~/.machina/kinds/<id>.json` (overwrite with confirm in UI: `Replace the library copy of this kind?` — this is the one confirm allowed; it is not delete-canvas).
- **Add from library:** copy into project `kinds/`, append/update pin, `addNode` uses that kind.
- **Library newer:** compare library file hash to pin. Banner: `A newer library copy of {name} exists.` Button: `Use library version` (copies file + updates pin). Never auto-apply.

Library is not used by `openEngine(dir)` — only project `kinds/` + pins.

## 7. Engine and compile

`compileProject` / `openEngineFromProject`:

1. `createRegistry()` + `registerCoreKinds`.
2. For each loaded manifest, `registry.register(kindManifestToDefinition(m))`.
3. `compile(project, registry)` as today.

`start()` after successful compile: if any **node in the flattened entry graph** (same flatten as compile) has `registry.get(kind, version)?.runtime === undefined` **and** that def came from a manifest (equivalently: `runtime == null`), refuse with `KIND_NO_RUNTIME`. Plugin kinds with omitted runtime must not exist; if a plugin forgot `runtime`, this check would also refuse — add `runtime: "none"` on plugins that skip, which already is the case. Test: a graph with only clock+world+logger still starts; a graph that **includes** `custom.foo` does not.

`openEngine(dir)` uses `loadProject` + `loadKindManifests` + `verifyProjectKinds`. In-memory `openEngineFromProject(project, opts)` gains optional `kinds?: KindManifest[]` on the existing opts object. Tests pass manifests without touching disk.

## 8. Editing semantics

- Changing ports/fields rewrites the file, recomputes hash, updates pin (this project’s copy).
- Removing a port: drop edges that reference that `sourcePort` / `targetPort` on nodes of that kind (store helper). Undo is canvas-ops’ stack — if undo is missing (parallel), still drop edges; document rebase onto canvas-ops for undo of kind edits.
- Dropped field keys disappear from node `config`; new fields get `default`.
- Studio author UI: Library **New kind**. Inspector when nothing selected can still open the author form from that button. Do not generate TypeScript.

## 9. Tests (required)

**Core:** canonical hash identical for key-reordered but equivalent manifests; different `cardColor` → different hash.

**node-sdk:** manifest → definition; `getOrThrow` works; `configSchema.parse` applies defaults.

**persistence:** save/load round-trip kinds + pins; `loadProject` still returns `MachinaProject` for a folder with no `kinds/`; `verifyProjectKinds` returns `KIND_PIN_MISMATCH` / `KIND_UNPINNED_FILE` / `KIND_PIN_MISSING_FILE` with frozen copy.

**engine:** compile OK on custom kind with legal CLOCK wire to a clock; `start` rejects `KIND_NO_RUNTIME`; graph without custom kinds still `start`s with a stub `think` as today.

**studio:** cannot save id `entities.actor`; `custom.radio-desk` appears under chosen category; publish then add-from-library creates a pinned copy (temp dir + mocked homedir).

No network. No LLM.

## 10. Out of scope

Prompt-generated `defineNode` plugins, BRANCH HERE, new port languages, silent library updates, treating authoring kinds as `runtime: "none"` so the world “runs” empty.

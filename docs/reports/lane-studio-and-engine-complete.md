# Lane — Studio and engine complete

**Branch:** `master` (no separate lane worktree)  
**Lane:** `lane/studio-and-engine-complete`  
**Spec:** `docs/superpowers/specs/2026-08-25-studio-and-engine-complete-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-25-studio-and-engine-complete.md`  
**Code tip:** `f701702`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `6baae8d` | feat: add agent packet plan fields and config English |
| `b54433c` | feat: add inspector fields and noun port labels to core kinds |
| `f245cdf` | feat: compile agent packets and require actor name and goal statement |
| `438e945` | fix: give preset and example goals statements so they compile |
| `7db1d7b` | feat: feed compiled packets names and logger into the kernel |
| `3df8e08` | fix: scale observation confidence with perception fog |
| `30a56b5` | fix: default logger record to both when config omits it |
| `6369adf` | feat: expose GodView on GET /runs/:id/truth |
| `94f4f94` | feat: generate Inspector fields from kind definitions |
| `f99eb7b` | feat: replace port pictograms with geometric marks |
| `63e1677` | fix: give port marks an explicit contrast color |
| `81c7ebd` | feat: move appearance to Configure and lock studio chrome |
| `df1488c` | fix: apply theme tokens to remaining studio chrome |
| `d2173da` | fix: apply theme tokens to kind author inspector |
| `70064d9` | fix: keep run panel mounted and drop nested library width |
| `f0b16ae` | feat: wire God truth edits and header stances |
| `1c8ec6c` | fix: apply one God edit and wait for god stance |
| `531cc6b` | feat: drive the canvas with React Flow state drop snap and minimap |
| `8fd3ea2` | fix: skip canvas echo by revision not a boolean latch |
| `f701702` | feat: fill starter world logger and inspector configs |

Docs commit follows this report.

## TDD evidence

| Failing test (then green) | Commit |
|---------------------------|--------|
| `kind config copy > names a missing actor` / `names a missing goal`; `instrument > accepts a logger line` | `6baae8d` |
| core-kind `fields` + noun port labels | `b54433c` |
| `compile > rejects an actor with an empty name`; `rejects a goal with an empty statement`; `resolves the agent packet from wired personality and goal` | `f245cdf` |
| preset/example goals with empty `statement` broke compile | `438e945` |
| `from-plan > puts wired personality on the think packet`; `kernel > uses actorNames and packets from kernel opts` | `7db1d7b` |
| `from-plan > scales observation confidence with perception fog` | `3df8e08` |
| `from-plan > defaults omitted logger record to both` | `30a56b5` |
| `client > getTruth is 403 until stance is god`; `applyIntervention posts path value and noticeable` | `6369adf` |
| `Inspector > shows Period for a clock`; `shows a Statement textbox for a goal`; `renders personality traits as 0–100 range sliders` | `94f4f94` |
| `port-language > matches the spec geometric symbol table exactly`; `port-symbol > draws a distinct 10×10 geometric primitive for each symbol id` | `f99eb7b` |
| `port-symbol > paints glyphs with an explicit contrast color, not inherited text color` | `63e1677` |
| chrome grid / Configure appearance / theme tokens on remaining surfaces | `81c7ebd`, `df1488c`, `d2173da` |
| `StudioShell chrome > keeps RunPanel mounted on Build so a started run survives the tab switch` | `70064d9` |
| `GodInspector > edits economy and posts the intervention path with noticeable`; `posts only the one resource that differs from truth` | `f0b16ae`, `1c8ec6c` |
| `flow-sync > snaps { x: 20, y: 10 } to the 16px grid`; `dnd > roundtrips a kind through setDragKind and kindFromDrop`; `Canvas > uses a dotted 16px background` | `531cc6b` |
| `flow-echo > skips only when the echo revision matches the current revision` | `8fd3ea2` |
| `starterProject > compiles with world logger and inspector configs filled` — expected `{}` to equal `{ name: "World" }` | `f701702` |

Task 11 grep: dead-channel-lite actors already have names (`Atlantic Federation`, `Vesper Union`, nested `Head of State` / `Intelligence` / `Military`). Compile tests that use `name: ""` are intentional (Task 3) and were left alone.

## Test summary

`pnpm test` from repo root: **73 files, 336/336 passed**.

Task 11 TDD: `starter.test.ts` failed on empty world `config: {}` → starter filled `name: "World"`, logger `{ record: "both" }`, inspector `{ title: "Inspector" }` → `compile(starterProject(), registry)` ok.

| Package | Tests |
|---------|-------|
| `@machina/core` | 24 |
| `@machina/node-sdk` | 7 |
| `@machina/ui` | 14 |
| `@machina/plugin-core` | 10 |
| `@machina/graph` | 13 |
| `@machina/simulation` | 22 |
| `@machina/agents` | 4 |
| `@machina/persistence` | 11 |
| `@machina/engine` | **37/37** |
| `@machina/runtime` | **29/29** |
| `@machina/client` | **12/12** |
| `@machina/studio` | **153/153** (includes 1 untracked `compose-proposer` test from an earlier session, not this lane) |

Commands:

```
pnpm test                              # 336/336
pnpm --filter @machina/engine test     # 37/37
pnpm --filter @machina/runtime test    # 29/29
pnpm --filter @machina/client test     # 12/12
pnpm --filter @machina/studio test     # 153/153
```

## Deliverables

- Frozen copy + `GodView` + `AgentPacket` / `emptyAgentPacket` + logger `InstrumentMsg` line
- Core kinds: Inspector `fields`, noun port labels, Zod defaults
- Compiler: actor name / goal statement English; packet wires on `SimulationPlan.agents[]`
- Kernel: packet, actor names, fog, logger `record`
- `GET /runs/:id/truth` → `GodView`; client `getTruth` / `applyIntervention`; `EngineRun.getGodView`
- Inspector generated from `KindField[]`
- Geometric `PortSymbolId` marks (not pictograms)
- Studio chrome grid; Appearance on Configure; `--machina-grid-dot`
- React Flow canvas: `useNodesState` / drop (`MACHINA_DND`) / snap / MiniMap / IR `writeGraph`
- Starter world/logger/inspector configs so `compile(starterProject(), registry)` succeeds with filled fields

## Invariants

- IR-first: runtime never reads `position`.
- `@machina/agents` does not import `@machina/simulation` or `TrueWorldState`.
- No `if (project.name === "dead-channel")`.
- Port **colors** stay the frozen hex table. Themes do not recolor ports.
- English errors only (`actorNeedsNameCopy`, `goalHasNoStatementCopy`).

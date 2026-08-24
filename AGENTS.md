# AGENTS.md — Machina

Rules for every agent writing code in this repo. **Read fully before touching code.**

**Spec:** `docs/superpowers/specs/2026-08-24-machina-design.md`  
**Orchestrator plan:** `docs/superpowers/plans/2026-08-24-machina.md`  
**Lane plans:** `docs/superpowers/plans/2026-08-24-machina-1*.md`, `2*.md`, `3*.md`

If code and spec disagree, the spec wins — flag the conflict, don't silently pick one.

---

## Keep this file current

**Every agent that finishes a wave or lane MUST update this file** before reporting done:

1. **Implementation status** — mark the wave/lane ✅ and note the merge commit or branch tip.
2. **Commands** — add any new scripts (`dev`, `build`, CLI) discovered during implementation.
3. **Repo layout** — add new directories or split files when structure changes.
4. **Frozen exports** — only if Wave 0 contracts change (requires coordinator approval).
5. **Concerns** — note deprecations, blockers, or follow-ups under **Open concerns**.

Do not leave AGENTS.md stale. A lane report without an AGENTS.md update is incomplete.

---

## Implementation status

| Wave | Status | Tag / branch | Tests |
|------|--------|--------------|-------|
| 0 — Frozen contracts | ✅ Done | `WAVE0` → `ec35279` | 13/13 (`pnpm test`) |
| **1 — Parallel lanes** | **✅ Merged** | **`WAVE1` → `790172d`** | **49/49 (`pnpm test`)** |
| 1a Compiler | ✅ Merged | `lane/1a-compiler` @ `fea8260` | 6/6 (`@machina/graph`) |
| 1b Kernel | ✅ Merged | `lane/1b-kernel` @ `f17ef9d` | 11/11 (`@machina/simulation`) |
| 1c Agents | ✅ Merged | `lane/1c-agents` @ `a9d703d` | 4/4 (`@machina/agents`) |
| 1d Persistence | ✅ Merged | `lane/1d-persistence` @ `d91ed6b` | 4/4 (`@machina/persistence`) |
| 1e Studio | ✅ Merged | `lane/1e-studio` @ `99f975c` | 5/5 (`@machina/studio`) |
| 1f Runtime | ✅ Merged | `lane/1f-runtime` @ `8698742` | 6/6 (`@machina/runtime`) |
| **2 — Parallel lanes** | **✅ Merged** | **`WAVE2` (pending tag)** | — |
| 2a Presets + LLM compose | ✅ Merged | `lane/2a-presets` @ `f18fe39` | 4/4 plugin-core · 9/9 graph · 8/8 studio |
| 2b RUN instrumentation | ✅ Merged | `lane/2b-run` @ `cc2b41a` | 12/12 sim · 10/10 studio · 7/7 runtime |
| 3 Dead Channel Lite | ⏳ In progress | — | — |

Reports: `docs/reports/wave0.md` · `lane-1a.md` · `lane-1b.md` · `lane-1c.md` · `lane-1d.md` · `lane-1e.md` · `lane-1f.md` · `lane-2a.md` · `lane-2b.md`

---

## Prime directives

1. **IR-first.** Visual graph ≠ LangGraph graph ≠ kernel graph. Runtime never reads `position`.
2. **Truth isolation.** `@machina/agents` imports packets from `@machina/core` only. Never import `@machina/simulation` or `TrueWorldState` in agent code.
3. **Compile, then run.** Invalid worlds don't start. Studio errors are English sentences, not stack traces.
4. **God writes events.** Interventions are `kind: "intervention"` events. No silent DB edits.
5. **Possess = Think slot.** Same packet, same ACTION shape. No chain-of-thought in UI.
6. **No scenario hacks.** Zero `if (project.name === "dead-channel")` in core, kernel, compiler, studio, or node-sdk.

---

## Code rules

- **DRY.** Search before writing. Shared types → `@machina/core`. Operator copy → `@machina/ui`. Node registration → `@machina/node-sdk`. Port matching → `matchPorts` in core only.
- **SRP.** One module, one job. **Target ~200 LOC per file** — split before you grow past it.
- **No manual scaffolding.** Use `pnpm init`, `pnpm create next-app`, `pnpm add package@latest`, and TDD. Do not hand-roll monorepo boilerplate or paste giant files.
- **Latest packages.** Add deps with `pnpm add <pkg>@latest` from the **owning package** directory (or `-w` for root devDeps). No deprecated APIs.
- **Frozen contracts.** Do not rename Wave 0 exports without coordinating all lanes.
- **TDD.** Failing test → minimal code → refactor. Engine tests: no network, no real LLM.
- **No narrating comments.**

### Stack (pin @latest at implementation time)

Node 22 · pnpm 9 · TypeScript 5.7+ · Vitest 3 · Zod 3 · Next.js 15 · React 19 · `@xyflow/react` 12 · Tailwind 4 · Drizzle · `@electric-sql/pglite` · `@langchain/langgraph` · `@langchain/core`

---

## Repo layout (current)

```
package.json              pnpm workspace root
pnpm-workspace.yaml
tsconfig.base.json
vitest.workspace.ts       # TODO: migrate to vitest.config.ts test.projects (Vitest 4)
.nvmrc                    # 22

packages/core/src/
  ports.ts errors.ts match-ports.ts ir.ts plan.ts events.ts packets.ts index.ts
packages/node-sdk/src/
  define-node.ts index.ts
packages/ui/src/
  english.ts tokens.ts index.ts
plugins/core/src/
  index.ts presets/ kinds/
packages/graph/           # Lane 1a ✅ — compile.ts; Lane 2a ✅ — compose.ts
packages/simulation/      # Lane 1b ✅ — rng.ts kernel.ts from-plan.ts types.ts (types internal)
                          # Lane 2b ✅ — instrument.ts (InstrumentMsg, onInstrument callback)
packages/agents/          # Lane 1c ✅ — graph.ts checkpointer.ts
packages/persistence/     # Lane 1d ✅ — project-files.ts db.ts schema.ts
apps/studio/              # Lane 1e ✅ — project-store, StudioShell; Lane 2a presets/; Lane 2b run/
apps/runtime/             # Lane 1f ✅ — app.ts ws.ts cli.ts (bin: machina)
apps/runtime/src/instrumentation.ts  # Lane 2b ✅ — toWs bridge
examples/dead-channel-lite/ # Wave 3
docs/reports/             # Implementation reports (required)
```

Studio talks to runtime over HTTP/WS. Studio does **not** import kernel internals.

---

## Frozen exports (Wave 0 — do not rename)

**`@machina/core`:** `PortType`, `PortDef`, `Cardinality`, `MachinaError`, `machinaError`, `matchPorts`, `MachinaProject`, `GraphDocument`, `MachinaNode`, `MachinaEdge`, `Wire`, `SimulationPlan`, `ObservationPacket`, `MachinaEvent`, `AgentAction`, `stripPositions`

**`@machina/node-sdk`:** `defineNode`, `NodeDefinition`, `NodeRegistry`, `createRegistry`

**`@machina/graph`:** `compile`, `composeFromDescription`, `ComposeProposer`

**`@machina/plugin-core`:** `registerCoreKinds`, 14 kinds v1, `nationPreset`, `cabinetPreset`, `agencyPreset`, `listBuiltinPresets`, `Preset`

**`@machina/ui`:** `portMismatchCopy`, `unknownKindCopy`, `versionMismatchCopy`, `missingClockCopy`, `canvasBg`, `accent`, `font`

**`@machina/simulation`:** `createRng`, `createKernel`, `createKernelFromPlan`, `actorIdsFromPlan`, `Kernel`, `ThinkFn`, `InstrumentMsg` — **`TrueWorldState` is internal only**

**`@machina/agents`:** `createAgentRuntime`, `compileAgentGraph`, `createAgentCheckpointer`, `PgliteCheckpointer`, `AgentRuntime`, `ThinkResult`, `Usage`

**`@machina/persistence`:** `saveProject`, `loadProject`, `createDb`, `ProjectMeta`, `MachinaDb`, `RunRecord`

**`@machina/runtime`:** `createApp`, `runCli`, WebSocket on `/ws`, CLI `machina run <dir> --turns N` · `machina test`

---

## Commands

```powershell
# Root (from machina/)
pnpm install
pnpm test                              # all packages — 49/49 after WAVE1
pnpm --filter @machina/core test
pnpm --filter @machina/graph test
pnpm --filter @machina/simulation test
pnpm --filter @machina/agents test
pnpm --filter @machina/persistence test
pnpm --filter @machina/studio test
pnpm --filter @machina/studio dev
pnpm --filter @machina/runtime test
pnpm exec machina test
pnpm exec machina run ./examples/dead-channel-lite --turns 20

# Add a dependency to a package (example)
cd packages/graph
pnpm add zod@latest
```

---

## Git

- Conventional commits: `feat:`, `test:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- One logical change per commit. Run tests before commit.
- Tag freeze points: `WAVE0`, `WAVE1`, etc.

---

## Parallel execution (Wave 1+)

### Lane ownership — only edit your paths

| Lane | Branch | Worktree | Owns |
|------|--------|----------|------|
| 1a Compiler | `lane/1a-compiler` | `../machina-1a` | `packages/graph/**` |
| 1b Kernel | `lane/1b-kernel` | `../machina-1b` | `packages/simulation/**` |
| 1c Agents | `lane/1c-agents` | `../machina-1c` | `packages/agents/**` |
| 1d Persistence | `lane/1d-persistence` | `../machina-1d` | `packages/persistence/**` |
| 1e Studio | `lane/1e-studio` | `../machina-1e` | `apps/studio/**` |
| 1f Runtime | `lane/1f-runtime` | `../machina-1f` | `apps/runtime/**` |
| 2b RUN instrumentation | `lane/2b-run` | `../machina-2b` | `apps/studio/src/run/**`, `apps/runtime/src/instrumentation.ts`, `packages/simulation/src/instrument.ts` |

### Worktree setup (per lane)

```powershell
cd C:\Users\axolatl-tank\Projects\machina
git worktree add C:\Users\axolatl-tank\Projects\machina-1a -b lane/1a-compiler WAVE0
cd C:\Users\axolatl-tank\Projects\machina-1a
pnpm install
```

- **Never edit another lane's files** — report `BLOCKED` instead.
- May **read** `@machina/core`, `@machina/node-sdk`, `@machina/ui`, `@machina/plugin-core`; do not modify them from a lane worktree.

### Merge order (after all six lanes pass)

`1a` → `1d` → `1b` → `1c` → `1f` → `1e` → tag `WAVE1` → update this file.

---

## Subagent workflow

1. Read **AGENTS.md** + your lane plan + Global Constraints from orchestrator plan.
2. TDD each task. Commit per task.
3. Replace stub `node -e "process.exit(0)"` test scripts with real Vitest.
4. Write `docs/reports/lane-<id>.md` with TDD evidence.
5. **Update AGENTS.md** implementation status for your lane.
6. Report: Status, commits, test summary, report path.

---

## Package names

`@machina/core` · `@machina/node-sdk` · `@machina/ui` · `@machina/graph` · `@machina/simulation` · `@machina/agents` · `@machina/persistence` · `@machina/plugin-core` · `@machina/studio` · `@machina/runtime`

---

## Open concerns

- Vitest: `vitest.workspace.ts` is deprecated — migrate to `test.projects` in root `vitest.config.ts` before Vitest 4.

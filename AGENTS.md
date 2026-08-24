# AGENTS.md — Machina

Rules for every agent writing code in this repo. **Read fully before touching code.**

**Spec:** `docs/superpowers/specs/2026-08-24-machina-design.md`  
**Orchestrator plan:** `docs/superpowers/plans/2026-08-24-machina.md`  
**Lane plans:** `docs/superpowers/plans/2026-08-24-machina-1*.md`, `2*.md`, `3*.md`

If code and spec disagree, the spec wins — flag the conflict, don't silently pick one.

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

- **DRY.** Search before writing. Shared types live in `@machina/core`. Operator copy lives in `@machina/ui`. Node registration lives in `@machina/node-sdk`. Don't duplicate port-matching or English strings.
- **SRP.** One module, one job. **Target ~200 LOC per file** — split before you grow past it. A 400-line `kinds.ts` is wrong; use `plugins/core/src/kinds/clock.ts`, `actor.ts`, etc.
- **Frozen contracts.** After Wave 0, do not rename exports in `@machina/core` or `@machina/node-sdk` without coordinating all lanes.
- **Latest packages.** Use current stable majors. Pin with `pnpm add package@latest` (or workspace catalog). No deprecated APIs.
- **Modern stack:** Node 22, pnpm 9, TypeScript 5.7+, Vitest 3, Zod 3, Next.js 15, React 19, `@xyflow/react` 12, Tailwind 4, Drizzle, `@electric-sql/pglite`, `@langchain/langgraph` + `@langchain/core`.
- **TDD.** Failing test → minimal code → refactor. Engine tests: no network, no real LLM.
- **No narrating comments.** Comments explain non-obvious intent only.

---

## Repo layout

```
apps/studio/          Next.js client — BUILD/RUN/ANALYZE UI
apps/runtime/         HTTP + WS + CLI
packages/core/        IR, ports, packets, plan types (FROZEN after Wave 0)
packages/graph/       Compiler
packages/simulation/  World kernel (no LangGraph)
packages/agents/      LangGraph cognition only
packages/persistence/ PGlite + project folders
packages/node-sdk/    defineNode + registry
packages/ui/          Operator English + design tokens
plugins/core/         V0 node kinds + presets
examples/dead-channel-lite/
```

Studio talks to runtime over HTTP/WS. Studio does **not** import kernel internals.

---

## Commands

```powershell
pnpm install
pnpm test                          # all packages
pnpm --filter @machina/core test
pnpm --filter @machina/graph test
pnpm --filter @machina/studio dev
pnpm --filter @machina/runtime dev
```

---

## Git

- Conventional commits: `feat:`, `test:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- One logical change per commit. Run tests before commit.

---

## Parallel execution (mandatory for Wave 1+)

| Lane | Branch | Owns (only these paths) |
|------|--------|-------------------------|
| 1a Compiler | `lane/1a-compiler` | `packages/graph/**` |
| 1b Kernel | `lane/1b-kernel` | `packages/simulation/**` |
| 1c Agents | `lane/1c-agents` | `packages/agents/**` |
| 1d Persistence | `lane/1d-persistence` | `packages/persistence/**` |
| 1e Studio | `lane/1e-studio` | `apps/studio/**` |
| 1f Runtime | `lane/1f-runtime` | `apps/runtime/**` |

- **Never edit another lane's files** to "fix" something — report BLOCKED instead.
- Wave 0 is sequential (one implementer). Wave 1: six implementers in parallel via git worktrees.
- Reports go to `docs/reports/<lane>-<task>.md`.

---

## Subagent workflow

1. Read AGENTS.md + your lane plan + Global Constraints from orchestrator plan.
2. TDD each task. Commit per task.
3. Self-review, then report: Status, commits, test summary, report path.
4. Do not read other plan files unless your lane depends on them.

---

## Package names

`@machina/core`, `@machina/node-sdk`, `@machina/ui`, `@machina/graph`, `@machina/simulation`, `@machina/agents`, `@machina/persistence`, `@machina/plugin-core`, `@machina/studio`, `@machina/runtime`

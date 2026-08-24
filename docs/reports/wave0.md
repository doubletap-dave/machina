# Wave 0 Implementation Report

Date: 2026-08-24  
Status: **DONE**

## Commits

| Task | SHA | Subject |
|------|-----|---------|
| 0.1 | `b573b1b` | feat: add monorepo and typed port matcher |
| 0.2 | `a3d30c8` | feat: add scenario IR, packets, and simulation plan types |
| 0.3 | `8fd6023` | feat: add node-sdk registry and operator English copy |
| 0.4 | `ec35279` | feat: register V0 core node kinds and Wave 1 package stubs |

## TDD Evidence

### Task 0.1 — Port matcher

1. Wrote `packages/core/tests/match-ports.test.ts` (4 cases) before implementation.
2. Initial run would fail (no package); after scaffold, tests drove `matchPorts` implementation.
3. Final: **4/4 passed** — RESOURCE→PERSONALITY operator sentence, generic mismatch, RESOURCE→RESOURCE ok, out→out refused.

### Task 0.2 — IR types

1. Wrote `packages/core/tests/ir.test.ts` (`stripPositions` deep-clone + zero layout).
2. Implemented `ir.ts`, `events.ts`, `packets.ts`, `plan.ts`; exported frozen contract types.
3. Final: **5/5 passed** (4 match-ports + 1 ir).

### Task 0.3 — node-sdk + ui

1. Wrote `registry.test.ts` (register/get/getOrThrow/version resolution) and `english.test.ts` (port mismatch copy).
2. Implemented `defineNode`, `NodeRegistry`, `createRegistry`, `operatorName`, English helpers, design tokens.
3. Final: **6/6 passed** (4 registry + 2 english).

### Task 0.4 — plugin-core + stubs

1. Wrote `kinds.test.ts` (14 kinds, operator names).
2. Split kinds across `plugins/core/src/kinds/` (control, entities, cognition, perception, systems, analysis, schemas).
3. Stubbed Wave 1 packages (graph, simulation, agents, persistence, studio, runtime) with `export {}` and no-op test scripts.
4. Final: **2/2 passed** (plugin-core); root `pnpm test` **13/13 passed**.

## Test Output (final verification)

```
pnpm test
 Test Files  5 passed (5)
      Tests  13 passed (13)
```

Per-package:
- `@machina/core`: 5 tests
- `@machina/node-sdk`: 4 tests
- `@machina/ui`: 2 tests
- `@machina/plugin-core`: 2 tests
- Wave 1 stubs: exit 0 (no vitest)

## Frozen Exports Delivered

**@machina/core:** PortType, PortDef, Cardinality, MachinaError, matchPorts, MachinaProject, GraphDocument, MachinaNode, MachinaEdge, Wire, SimulationPlan, ObservationPacket, MachinaEvent, AgentAction, stripPositions

**@machina/node-sdk:** defineNode, NodeDefinition, NodeRegistry, createRegistry

**@machina/plugin-core:** registerCoreKinds (14 V0 kinds v1)

## File Layout

Kinds split per AGENTS.md SRP (~200 LOC max):
- `kinds/control.ts` — clock, event
- `kinds/entities.ts` — world, actor, resource
- `kinds/cognition.ts` — agent, personality, goal, memory
- `kinds/perception.ts` — perception
- `kinds/systems.ts` — system, relationship
- `kinds/analysis.ts` — inspector, logger
- `kinds/schemas.ts` — shared Zod config schemas

## Concerns

- Vitest warns `vitest.workspace.ts` is deprecated; migrate to `test.projects` in root config before Vitest 4.
- `ir.test.ts` was included in the 0.1 commit (scaffolded early); no functional impact.
- Wave 1 stubs use `node -e "process.exit(0)"` — lanes must replace with real Vitest suites.

## Next Step

Tag `WAVE0` at `ec35279` and dispatch six parallel Wave 1 lanes per orchestrator plan.

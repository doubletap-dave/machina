# Machina Lane 2b — RUN instrumentation + stances

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. After Wave 1 merge. Writable: `apps/studio/src/run/**`, `apps/runtime/src/instrumentation.ts`, `apps/runtime/tests/instrumentation.test.ts`, `packages/simulation/src/instrument.ts`, `packages/simulation/tests/instrument.test.ts`.

**Goal:** Watch / God / Possess in RUN; live events; rewind inspector; ANALYZE tab = turn slider.

---

### Task 1: kernel instrumentation events

**Files:**
- Create: `packages/simulation/src/instrument.ts`
- Modify: `packages/simulation/src/kernel.ts` to accept `onInstrument?: (msg: InstrumentMsg) => void`

**Interfaces:**

```ts
export type InstrumentMsg =
  | { type: "turn"; turn: number }
  | { type: "node-active"; nodeId: string }
  | { type: "edge-pulse"; from: string; to: string; portType: string }
  | { type: "possess-wait"; nodeId: string; packet: import("@machina/core").ObservationPacket }
  | { type: "error"; message: string };
```

- [ ] **Step 1: Kernel test: mocked think, one turn, `onInstrument` receives `type: "turn"`. Commit** `feat: emit run instrumentation from kernel`

---

### Task 2: stance HTTP already in 1f — studio RUN UI

**Files:**
- Create: `apps/studio/src/run/StanceBar.tsx`, `apps/studio/src/run/PossessPanel.tsx`, `apps/studio/src/run/AnalyzeTab.tsx`, `apps/studio/src/run/speed.ts`, `apps/studio/src/run/stance.test.ts`

**Interfaces:**

```ts
export type Stance = { mode: "watch" | "god" | "possess"; nodeId?: string };
export function legalPossessTargets(project: MachinaProject, selectedNodeId: string | null): string[];
export function delayForSpeed(speed: 1 | 10 | 100): number;
```

`delayForSpeed(1) === 1000`, `delayForSpeed(10) === 100`, `delayForSpeed(100) === 10` (ms between mechanical ticks; LLM still wall-clock).

`legalPossessTargets`: if selected node is `cognition.agent`, return `[id]`; if container with subgraph, return all `cognition.agent` ids in that subgraph; if null and run option all, return all agent ids in project.

PossessPanel renders `packet.legalActions` as buttons, never a JSON dump of the packet as the primary UI (a short facts list of `observations[].attribute` is OK). No field named `chainOfThought`.

AnalyzeTab: input type range `min=0` `max={maxTurn}` calling `onRewind(turn)`.

- [ ] **Step 1: Unit tests for `legalPossessTargets`. Render test: PossessPanel has buttons for legal actions, document.body.innerHTML does not include `chainOfThought`.**

- [ ] **Step 2: Implement + commit** `feat: add Watch God Possess UI and ANALYZE rewind slider`

---

### Task 3: runtime WS maps kernel instrument

**Files:**
- Create: `apps/runtime/src/instrumentation.ts`

Bridge `InstrumentMsg` → WS JSON from lane 1f. Test: calling `toWs({ type: "turn", turn: 3 })` equals `{ type: "turn", turn: 3 }`.

- [ ] **Commit** `feat: map kernel instrumentation to WebSocket payloads`

---

Lane 2b done when stances resolve agent ids, possess UI is buttons, rewind slider exists, no CoT.

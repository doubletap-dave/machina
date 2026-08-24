# Machina Lane 1b — World kernel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `packages/simulation/**` only. Do not import LangGraph. Mock cognition with `ThinkFn`.

**Goal:** Seeded turn loop: clock → systems → perception → think/possess → resolve → snapshot. Interventions as events. Rewind by snapshot.

**Architecture:** Kernel holds `TrueWorldState` privately. `packages/agents` is not a dependency. `ThinkFn` is injected.

**Tech Stack:** TypeScript, Vitest, `@machina/core`.

---

### Task 1: seeded RNG

**Files:**
- Modify: `packages/simulation/package.json` (deps `@machina/core`, vitest)
- Create: `packages/simulation/src/rng.ts`, `packages/simulation/src/index.ts`, `packages/simulation/tests/rng.test.ts`

**Interfaces:**
- Produces: `export function createRng(seed: number): { next(): number }` — `next()` in `[0, 1)`. Same seed, same sequence. No `Math.random`, no `Date`.

- [ ] **Step 1: Test two RNGs with seed `42` produce identical 20-length sequences; seed `43` differs.**

- [ ] **Step 2: FAIL then implement mulberry32:**

```ts
export function createRng(seed: number) {
  let t = seed >>> 0;
  return {
    next() {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}
```

- [ ] **Step 3: PASS and commit** `feat: add seeded simulation RNG`

---

### Task 2: turn loop with mocked think

**Files:**
- Create: `packages/simulation/src/types.ts`, `packages/simulation/src/kernel.ts`, `packages/simulation/tests/kernel.test.ts`

**Interfaces:**

```ts
export type TrueWorldState = {
  turn: number;
  actors: Record<string, { name: string; resources: Record<string, number> }>;
};

export type ThinkFn = (input: {
  nodeId: string;
  packet: import("@machina/core").ObservationPacket;
}) => Promise<import("@machina/core").AgentAction>;

export type Kernel = {
  runTurn(): Promise<{ events: import("@machina/core").MachinaEvent[]; snapshot: TrueWorldState }>;
  applyIntervention(payload: { path: string; value: unknown; noticeable: boolean }): void;
  rewind(turn: number): void;
  getTruth(): TrueWorldState; // God only — runtime must not pass this to agents
  paused: boolean;
};

export function createKernel(opts: {
  seed: number;
  actorIds: string[];
  think: ThinkFn;
}): Kernel;
```

`createKernel` starts `turn: 0`, each actor `{ name: actorId, resources: { economy: 50 } }`. `applyIntervention` throws if `!paused` with message `Pause the world before changing it.`; if paused, sets `paused` remains true until `runTurn`. Callers set `kernel.paused = true` before God edits.

`runTurn` if paused for intervention: apply queued intervention as event `kind: "intervention"` then clear pause. Always: increment turn, emit `{ kind: "tick" }`, build packets with `legalActions: ["wait", "signal"]` and observations `{ attribute: "enemy.economy", value: 50 + noise, confidence: 0.5, ageTurns: 0, source: "osint" }` where `noise = Math.round((rng.next() - 0.5) * 20)` so truth 50 is not copied into the packet as a guaranteed equal value. Call `think` per actor. Append `{ kind: "action", payload: action }`. Snapshot clone. Never put `getTruth().actors` into `packet.observations` by reference.

- [ ] **Step 1: Tests**

1. Two kernels seed 1, mocked think returns `{ actorId, type: "wait", params: {} }` → event `kind` sequences equal after 3 turns.
2. Packet `observations` must not deep-equal true economy for both actors every turn (if they match, perception failed to add noise — assert at least one observation value !== 50 across 5 turns OR document that noise can theoretically be 0; use `value: 50 + (rng.next() > 0.5 ? 7 : -7)` so never 50).
3. `applyIntervention` while not paused throws `Pause the world before changing it.`
4. Pause, `applyIntervention({ path: "actors.a.resources.economy", value: 10, noticeable: false })`, `runTurn` → truth economy is 10, events include `kind: "intervention"`.
5. Run 3 turns, `rewind(1)`, `getTruth().turn === 1`.
6. Mocked think receives `packet` type only; test file imports `ObservationPacket` from core, not `TrueWorldState` from a barrel that agents use. Export `TrueWorldState` from `types.ts` but **do not** re-export it from `packages/simulation/src/index.ts`. Index exports `createKernel`, `createRng`, `Kernel`, `ThinkFn` only.

- [ ] **Step 2: FAIL, implement, PASS**

- [ ] **Step 3: Commit** `feat: add seeded turn kernel with interventions and rewind`

---

Lane 1b done when kernel tests pass, `TrueWorldState` is not on the package public index, and `createKernelFromPlan` exists.

---

### Task 3: createKernelFromPlan

**Files:**
- Create: `packages/simulation/src/from-plan.ts`, `packages/simulation/tests/from-plan.test.ts`
- Modify: `packages/simulation/src/index.ts` — export `createKernelFromPlan`, `actorIdsFromPlan` (not `TrueWorldState`)

**Interfaces:**

```ts
import type { SimulationPlan } from "@machina/core";

export function actorIdsFromPlan(plan: SimulationPlan): string[];
export function createKernelFromPlan(
  plan: SimulationPlan,
  opts: { seed: number; think: ThinkFn },
): Kernel;
```

`actorIdsFromPlan` returns unique `plan.agents[].actorRef` in plan order. `createKernelFromPlan` calls `createKernel({ seed: opts.seed, actorIds: actorIdsFromPlan(plan), think: opts.think })`.

- [ ] **Step 1: Test** a fixture `SimulationPlan` with two agents `actorRef: "a"` and `"b"` → `actorIdsFromPlan` equals `["a", "b"]`. `createKernelFromPlan` `getTruth().actors` has keys `a` and `b` (via rewind/getTruth in test — getTruth is allowed in simulation tests, not in agents).

- [ ] **Step 2: Implement, PASS, commit** `feat: construct kernel from SimulationPlan actor refs`

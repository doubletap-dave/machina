# Machina Lane 1c — LangGraph cognition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `packages/agents/**` only. MUST NOT import `@machina/simulation` or any `TrueWorldState`.

**Goal:** Per-agent LangGraph subgraph: observation packet in, `AgentAction` out, token usage recorded, Possess via `interrupt()`.

**Architecture:** `compileAgentGraph(nodeId)` returns a compiled graph. `thread_id = `${runId}:${nodeId}``. Checkpointer: `MemorySaver` in tests; production adapter stub `PgliteCheckpointer` that implements `put`/`getTuple` no-ops until 1d exists — use `MemorySaver` for V0 if adapter is incomplete, but export `createAgentCheckpointer(): Checkpointer`.

**Tech Stack:** `@langchain/langgraph`, `@langchain/core`, `@langchain/langgraph-checkpoint`, Vitest, `@machina/core`.

---

### Task 1: mocked model think

**Files:**
- Modify: `packages/agents/package.json` — deps `@machina/core`, `@langchain/langgraph`, `@langchain/core`, `@langchain/langgraph-checkpoint`
- Create: `packages/agents/src/graph.ts`, `packages/agents/src/index.ts`, `packages/agents/tests/graph.test.ts`

**Interfaces:**

```ts
import type { AgentAction, ObservationPacket } from "@machina/core";

export type Usage = { inputTokens: number; outputTokens: number; totalTokens: number };

export type ThinkResult = { action: AgentAction; usage: Usage };

export type AgentRuntime = {
  think(packet: ObservationPacket, threadId: string): Promise<ThinkResult>;
  possessWait(packet: ObservationPacket, threadId: string): Promise<{ status: "interrupted"; packet: ObservationPacket; legalActions: string[] }>;
  resumePossess(threadId: string, action: AgentAction): Promise<ThinkResult>;
};

export function createAgentRuntime(opts: {
  nodeId: string;
  invoker: (packet: ObservationPacket) => Promise<{ action: AgentAction; usage: Usage }>;
}): AgentRuntime;
```

- [ ] **Step 1: Tests**

`invoker` returns `{ action: { actorId: "a", type: "wait", params: {} }, usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 } }`. `think` returns that action and usage. `createAgentRuntime` file must `import type { ObservationPacket }` from `@machina/core` only.

Grep test: `packages/agents/src` contains no string `TrueWorldState` and no import from `@machina/simulation`.

- [ ] **Step 2: FAIL then implement a StateGraph with one node `decide` that calls `invoker` and writes `action` + `usage` into state. compile with MemorySaver. `think` invokes with `{ configurable: { thread_id: threadId } }`.**

If LangGraph API in installed version differs, adapt to that version’s `StateGraph` + `MemorySaver` but keep `AgentRuntime` signatures identical.

- [ ] **Step 3: PASS, commit** `feat: add LangGraph agent think with token usage`

---

### Task 2: Possess interrupt

**Files:**
- Modify: `packages/agents/src/graph.ts`
- Test: `packages/agents/tests/possess.test.ts`

**Interfaces:** same `AgentRuntime.possessWait` / `resumePossess`

- [ ] **Step 1: Test** `possessWait` returns `status: "interrupted"` and `legalActions` from `packet.legalActions`. It must not call `invoker`. `resumePossess` returns the human `action` with `usage` all zeros.

Implementation: `possessWait` does not invoke the model. Store the packet in a `Map<string, ObservationPacket>` keyed by `threadId` and return `{ status: "interrupted", packet, legalActions: packet.legalActions }`. `resumePossess` reads the map, deletes the entry, returns `{ action, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }`. Do not call `invoker`. Do not wait on LangGraph `interrupt()` in V0.

- [ ] **Step 2: PASS, commit** `feat: add possess interrupt with zero token usage`

---

Lane 1c done when think + possess tests pass and simulation is not imported.

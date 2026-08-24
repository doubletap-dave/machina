import { describe, expect, it, vi } from "vitest";
import type { AgentAction, ObservationPacket } from "@machina/core";
import { createAgentRuntime } from "../src/index.ts";

const packet: ObservationPacket = {
  actorId: "a",
  turn: 2,
  observations: [],
  memory: null,
  goals: null,
  personality: null,
  legalActions: ["wait", "speak"],
};

const invoker = vi.fn(async () => ({
  action: { actorId: "a", type: "wait", params: {} },
  usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
}));

describe("createAgentRuntime possess", () => {
  it("possessWait interrupts without calling invoker", async () => {
    const runtime = createAgentRuntime({ nodeId: "actor-1", invoker });
    invoker.mockClear();

    const result = await runtime.possessWait(packet, "run-1:actor-1");

    expect(result).toEqual({
      status: "interrupted",
      packet,
      legalActions: ["wait", "speak"],
    });
    expect(invoker).not.toHaveBeenCalled();
  });

  it("resumePossess returns human action with zero token usage", async () => {
    const runtime = createAgentRuntime({ nodeId: "actor-1", invoker });
    const threadId = "run-2:actor-1";
    await runtime.possessWait(packet, threadId);
    invoker.mockClear();

    const humanAction: AgentAction = {
      actorId: "a",
      type: "speak",
      params: { text: "hello" },
    };

    const result = await runtime.resumePossess(threadId, humanAction);

    expect(result).toEqual({
      action: humanAction,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
    expect(invoker).not.toHaveBeenCalled();
  });
});

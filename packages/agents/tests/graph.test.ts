import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AgentAction, ObservationPacket } from "@machina/core";
import { createAgentRuntime } from "../src/index.ts";

const packet: ObservationPacket = {
  actorId: "a",
  turn: 1,
  observations: [],
  memory: null,
  goals: null,
  personality: null,
  legalActions: ["wait", "move"],
};

const action: AgentAction = {
  actorId: "a",
  type: "wait",
  params: {},
};

const usage = { inputTokens: 3, outputTokens: 1, totalTokens: 4 };

describe("createAgentRuntime.think", () => {
  it("returns action and usage from invoker via LangGraph decide node", async () => {
    const invoker = vi.fn(async () => ({ action, usage }));
    const runtime = createAgentRuntime({ nodeId: "actor-1", invoker });

    const result = await runtime.think(packet, "run-1:actor-1");

    expect(result).toEqual({ action, usage });
    expect(invoker).toHaveBeenCalledOnce();
    expect(invoker).toHaveBeenCalledWith(packet);
  });
});

describe("truth isolation", () => {
  it("src does not reference TrueWorldState or @machina/simulation", () => {
    const srcDir = join(import.meta.dirname, "..", "src");
    const files = readdirSync(srcDir).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const content = readFileSync(join(srcDir, file), "utf8");
      expect(content).not.toContain("TrueWorldState");
      expect(content).not.toMatch(/@machina\/simulation/);
    }
  });
});

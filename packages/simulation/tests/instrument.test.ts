import { describe, expect, it, vi } from "vitest";
import { createKernel, type ThinkFn } from "../src/index.ts";

const waitThink: ThinkFn = async ({ nodeId }) => ({
  actorId: nodeId,
  type: "wait",
  params: {},
});

describe("kernel instrumentation", () => {
  it("emits turn message when running a turn", async () => {
    const onInstrument = vi.fn();
    const think = vi.fn<ThinkFn>(waitThink);
    const kernel = createKernel({
      seed: 1,
      actorIds: ["a"],
      think,
      onInstrument,
    });

    await kernel.runTurn();

    expect(onInstrument).toHaveBeenCalledWith({ type: "turn", turn: 1 });
    expect(onInstrument).toHaveBeenCalledWith({ type: "node-active", nodeId: "a" });
    expect(onInstrument).toHaveBeenCalledWith({
      type: "edge-pulse",
      from: "a",
      to: "a",
      portType: "OBSERVATION",
    });
    expect(onInstrument).toHaveBeenCalledWith({
      type: "edge-pulse",
      from: "a",
      to: "a",
      portType: "ACTION",
    });
  });
});

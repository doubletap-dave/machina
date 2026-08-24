import { describe, expect, it } from "vitest";
import type { SimulationPlan } from "@machina/core";
import { actorIdsFromPlan, createKernelFromPlan } from "../src/index.ts";

const plan: SimulationPlan = {
  projectId: "p1",
  clock: { nodeId: "clock", config: {} },
  systems: [],
  agents: [
    { nodeId: "agent-a", actorRef: "a", graphRef: "g1", packetWires: [] },
    { nodeId: "agent-b", actorRef: "b", graphRef: "g1", packetWires: [] },
  ],
  perception: [],
  analysis: [],
};

describe("createKernelFromPlan", () => {
  it("derives actor ids from plan agent refs", () => {
    expect(actorIdsFromPlan(plan)).toEqual(["a", "b"]);
  });

  it("initializes kernel actors from plan refs", () => {
    const kernel = createKernelFromPlan(plan, {
      seed: 1,
      think: async ({ nodeId }) => ({ actorId: nodeId, type: "wait", params: {} }),
    });

    expect(Object.keys(kernel.getTruth().actors).sort()).toEqual(["a", "b"]);
  });
});

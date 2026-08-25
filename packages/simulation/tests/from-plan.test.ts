import { describe, expect, it } from "vitest";
import { emptyAgentPacket, type InstrumentMsg, type SimulationPlan } from "@machina/core";
import { actorIdsFromPlan, createKernelFromPlan } from "../src/index.ts";

const plan: SimulationPlan = {
  projectId: "p1",
  clock: { nodeId: "clock", config: {} },
  systems: [],
  agents: [
    {
      nodeId: "agent-a",
      actorRef: "a",
      graphRef: "g1",
      packetWires: [],
      packet: emptyAgentPacket(),
    },
    {
      nodeId: "agent-b",
      actorRef: "b",
      graphRef: "g1",
      packetWires: [],
      packet: emptyAgentPacket(),
    },
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

  it("puts wired personality on the think packet", async () => {
    const wired: SimulationPlan = {
      ...plan,
      agents: [
        {
          nodeId: "agent-a",
          actorRef: "a",
          graphRef: "g1",
          packetWires: [],
          packet: {
            personality: { aggression: 80, paranoia: 10, cooperation: 50, risk: 50 },
            goals: { statement: "Hold the canal", priority: 90 },
            memory: { seed: "Last winter was hard." },
          },
        },
      ],
      systems: [
        {
          nodeId: "a",
          kind: "entities.actor",
          config: { name: "Ada" },
          wires: [],
        },
      ],
      analysis: [
        {
          nodeId: "log",
          kind: "analysis.logger",
          config: { record: "actions" },
          wires: [],
        },
      ],
    };
    const logs: InstrumentMsg[] = [];
    const kernel = createKernelFromPlan(wired, {
      seed: 1,
      onInstrument: (msg) => logs.push(msg),
      think: async ({ packet }) => {
        expect(packet.personality).toEqual(wired.agents[0]!.packet.personality);
        expect((packet.goals as { statement: string }).statement).toBe("Hold the canal");
        expect(packet.memory).toEqual({ seed: "Last winter was hard." });
        return { actorId: packet.actorId, type: "wait", params: {} };
      },
    });
    expect(kernel.getTruth().actors.a?.name).toBe("Ada");
    await kernel.runTurn();
    expect(logs.some((m) => m.type === "log" && m.record === "action")).toBe(true);
    expect(logs.some((m) => m.type === "log" && m.record === "event")).toBe(false);
  });

  it("scales observation noise by perception fog", async () => {
    const fogged: SimulationPlan = {
      ...plan,
      agents: [
        {
          nodeId: "agent-a",
          actorRef: "a",
          graphRef: "g1",
          packetWires: [],
          packet: emptyAgentPacket(),
        },
      ],
      perception: [{ nodeId: "perc", config: { fog: 0 }, wires: [] }],
    };
    let observed: number | undefined;
    const kernel = createKernelFromPlan(fogged, {
      seed: 1,
      think: async ({ packet }) => {
        observed = packet.observations[0]?.value as number;
        return { actorId: packet.actorId, type: "wait", params: {} };
      },
    });
    await kernel.runTurn();
    expect(observed).toBe(50);
  });

  it("scales observation confidence with perception fog", async () => {
    const confidenceAt = async (fog: number) => {
      const fogged: SimulationPlan = {
        ...plan,
        agents: [
          {
            nodeId: "agent-a",
            actorRef: "a",
            graphRef: "g1",
            packetWires: [],
            packet: emptyAgentPacket(),
          },
        ],
        perception: [{ nodeId: "perc", config: { fog }, wires: [] }],
      };
      let confidence: number | undefined;
      const kernel = createKernelFromPlan(fogged, {
        seed: 1,
        think: async ({ packet }) => {
          confidence = packet.observations[0]?.confidence;
          return { actorId: packet.actorId, type: "wait", params: {} };
        },
      });
      await kernel.runTurn();
      return confidence;
    };
    expect(await confidenceAt(0)).toBe(1);
    expect(await confidenceAt(100)).toBe(0);
  });

  it("emits event logs when logger record is events", async () => {
    const logged: SimulationPlan = {
      ...plan,
      agents: [
        {
          nodeId: "agent-a",
          actorRef: "a",
          graphRef: "g1",
          packetWires: [],
          packet: emptyAgentPacket(),
        },
      ],
      analysis: [
        {
          nodeId: "log",
          kind: "analysis.logger",
          config: { record: "events" },
          wires: [],
        },
      ],
    };
    const logs: InstrumentMsg[] = [];
    const kernel = createKernelFromPlan(logged, {
      seed: 1,
      onInstrument: (msg) => logs.push(msg),
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    await kernel.runTurn();
    expect(logs.some((m) => m.type === "log" && m.record === "event")).toBe(true);
    expect(logs.some((m) => m.type === "log" && m.record === "action")).toBe(false);
  });

  it("defaults omitted logger record to both", async () => {
    const logged: SimulationPlan = {
      ...plan,
      agents: [
        {
          nodeId: "agent-a",
          actorRef: "a",
          graphRef: "g1",
          packetWires: [],
          packet: emptyAgentPacket(),
        },
      ],
      analysis: [
        {
          nodeId: "log",
          kind: "analysis.logger",
          config: {},
          wires: [],
        },
      ],
    };
    const logs: InstrumentMsg[] = [];
    const kernel = createKernelFromPlan(logged, {
      seed: 1,
      onInstrument: (msg) => logs.push(msg),
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    await kernel.runTurn();
    expect(logs.some((m) => m.type === "log" && m.record === "action")).toBe(true);
    expect(logs.some((m) => m.type === "log" && m.record === "event")).toBe(true);
  });
});

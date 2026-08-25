import { describe, expect, it, vi } from "vitest";
import type { InstrumentMsg, ObservationPacket } from "@machina/core";
import { createKernel, type ThinkFn } from "../src/index.ts";

const waitThink: ThinkFn = async ({ nodeId }) => ({
  actorId: nodeId,
  type: "wait",
  params: {},
});

function eventKinds(events: { kind: string }[]): string[] {
  return events.map((event) => event.kind);
}

describe("createKernel", () => {
  it("produces identical event kind sequences for the same seed", async () => {
    const run = async (seed: number) => {
      const kernel = createKernel({ seed, actorIds: ["a", "b"], think: waitThink });
      const kinds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { events } = await kernel.runTurn();
        kinds.push(...eventKinds(events));
      }
      return kinds;
    };

    expect(await run(1)).toEqual(await run(1));
  });

  it("never copies true economy into packet observations", async () => {
    const kernel = createKernel({ seed: 2, actorIds: ["a", "b"], think: waitThink });
    let sawNonFifty = false;

    for (let i = 0; i < 5; i++) {
      const packets: ObservationPacket[] = [];
      const think: ThinkFn = async ({ packet }) => {
        packets.push(packet);
        return { actorId: packet.actorId, type: "wait", params: {} };
      };
      const seeded = createKernel({ seed: 2 + i, actorIds: ["a", "b"], think });
      await seeded.runTurn();
      for (const packet of packets) {
        for (const observation of packet.observations) {
          if (observation.attribute === "enemy.economy" && observation.value !== 50) {
            sawNonFifty = true;
          }
        }
      }
    }

    expect(sawNonFifty).toBe(true);
  });

  it("requires pause before god edits", () => {
    const kernel = createKernel({ seed: 1, actorIds: ["a"], think: waitThink });

    expect(() =>
      kernel.applyIntervention({
        path: "actors.a.resources.economy",
        value: 10,
        noticeable: false,
      }),
    ).toThrow("Pause the world before changing it.");
  });

  it("applies queued interventions on the next turn", async () => {
    const kernel = createKernel({ seed: 1, actorIds: ["a", "b"], think: waitThink });
    kernel.paused = true;
    kernel.applyIntervention({
      path: "actors.a.resources.economy",
      value: 10,
      noticeable: false,
    });

    const { events } = await kernel.runTurn();

    expect(kernel.getTruth().actors.a?.resources.economy).toBe(10);
    expect(events.some((event) => event.kind === "intervention")).toBe(true);
    expect(kernel.paused).toBe(false);
  });

  it("rewinds truth to an earlier turn", async () => {
    const kernel = createKernel({ seed: 1, actorIds: ["a"], think: waitThink });
    await kernel.runTurn();
    await kernel.runTurn();
    await kernel.runTurn();

    kernel.rewind(1);

    expect(kernel.getTruth().turn).toBe(1);
  });

  it("passes observation packets to think without exposing truth state", async () => {
    const think = vi.fn<ThinkFn>(async ({ nodeId }) => ({
      actorId: nodeId,
      type: "wait",
      params: {},
    }));
    const kernel = createKernel({ seed: 1, actorIds: ["a"], think });

    await kernel.runTurn();

    const packet = think.mock.calls[0]?.[0]?.packet;
    expect(packet).toBeDefined();
    const typed: ObservationPacket = packet!;
    expect(typed.legalActions).toEqual(["wait", "signal"]);
    expect(typed.observations.length).toBeGreaterThan(0);
    expect(typed.personality).toBeNull();
    expect(typed.goals).toBeNull();
    expect(typed.memory).toBeNull();
    expect("truth" in typed).toBe(false);
  });

  it("uses actorNames and packets from kernel opts", async () => {
    const think = vi.fn<ThinkFn>(async ({ packet }) => ({
      actorId: packet.actorId,
      type: "wait",
      params: {},
    }));
    const kernel = createKernel({
      seed: 1,
      actorIds: ["a"],
      actorNames: { a: "Ada" },
      packets: {
        a: {
          personality: { aggression: 1 },
          goals: { statement: "Hold" },
          memory: { seed: "winter" },
        },
      },
      think,
    });
    expect(kernel.getTruth().actors.a?.name).toBe("Ada");
    await kernel.runTurn();
    const packet = think.mock.calls[0]?.[0]?.packet;
    expect(packet?.personality).toEqual({ aggression: 1 });
    expect(packet?.goals).toEqual({ statement: "Hold" });
    expect(packet?.memory).toEqual({ seed: "winter" });
  });

  it("scales observation noise by fog and emits logger instruments", async () => {
    const packets: ObservationPacket[] = [];
    const msgs: InstrumentMsg[] = [];
    const kernel = createKernel({
      seed: 1,
      actorIds: ["a"],
      fog: 0,
      logActions: true,
      logEvents: false,
      onInstrument: (m) => msgs.push(m),
      think: async ({ packet }) => {
        packets.push(packet);
        return { actorId: packet.actorId, type: "wait", params: {} };
      },
    });
    await kernel.runTurn();
    expect(packets[0]?.observations[0]?.value).toBe(50);
    expect(msgs.some((m) => m.type === "log" && m.record === "action")).toBe(true);
    expect(msgs.some((m) => m.type === "log" && m.record === "event")).toBe(false);
  });

  it("peekPacket matches think packet shape and has no truth field", async () => {
    const msgs: InstrumentMsg[] = [];
    const kernel = createKernel({
      seed: 1,
      actorIds: ["a"],
      onInstrument: (m) => msgs.push(m),
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    const peeked = kernel.peekPacket("a");
    expect(peeked.actorId).toBe("a");
    expect(peeked.legalActions.length).toBeGreaterThan(0);
    expect(JSON.stringify(peeked)).not.toContain("TrueWorldState");
    expect(kernel.getTruth().turn).toBe(0);
    await kernel.runTurn();
    expect(msgs.some((m) => m.type === "turn")).toBe(true);
    expect(msgs.some((m) => m.type === "node-active")).toBe(true);
    expect(msgs.some((m) => m.type === "edge-pulse")).toBe(true);
    expect(msgs.some((m) => m.type === "edge-pulse" && m.portType === "OBSERVATION")).toBe(
      true,
    );
    expect(msgs.some((m) => m.type === "edge-pulse" && m.portType === "ACTION")).toBe(true);
  });

  it("peekPacket rejects unknown actors in English", () => {
    const kernel = createKernel({ seed: 1, actorIds: ["a"], think: waitThink });
    expect(() => kernel.peekPacket("ghost")).toThrow("Unknown actor: ghost");
  });

  it("peekPacket does not desync think packets for the same seed", async () => {
    const thinkPackets = async (peekFirst: boolean) => {
      const packets: ObservationPacket[] = [];
      const kernel = createKernel({
        seed: 7,
        actorIds: ["a", "b"],
        think: async ({ packet }) => {
          packets.push(packet);
          return { actorId: packet.actorId, type: "wait", params: {} };
        },
      });
      if (peekFirst) {
        kernel.peekPacket("a");
        kernel.peekPacket("b");
      }
      await kernel.runTurn();
      return packets;
    };

    expect(await thinkPackets(true)).toEqual(await thinkPackets(false));
  });
});

describe("package exports", () => {
  it("does not expose TrueWorldState on the public index", async () => {
    const mod = await import("../src/index.ts");
    expect("TrueWorldState" in mod).toBe(false);
  });
});

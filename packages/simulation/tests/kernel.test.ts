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
});

describe("package exports", () => {
  it("does not expose TrueWorldState on the public index", async () => {
    const mod = await import("../src/index.ts");
    expect("TrueWorldState" in mod).toBe(false);
  });
});

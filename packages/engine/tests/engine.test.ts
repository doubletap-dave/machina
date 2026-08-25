import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { InstrumentMsg } from "@machina/core";
import { loadProject } from "@machina/persistence";
import { openEngine, openEngineFromProject } from "../src/engine.ts";

const dir = resolve(import.meta.dirname, "../../../examples/dead-channel-lite");

const waitThink = async ({ packet }: { packet: { actorId: string } }) => ({
  actorId: packet.actorId,
  type: "wait",
  params: {},
});

describe("openEngine", () => {
  it("compiles Dead Channel Lite", async () => {
    const engine = await openEngine(dir, {
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    const compiled = engine.compile();
    expect(compiled.ok).toBe(true);
  });

  it("steps one turn and subscribe sees turn", async () => {
    const engine = await openEngine(dir, {
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    const seen: string[] = [];
    const run = await engine.start({ seed: 7 });
    run.subscribe((m) => seen.push(m.type));
    const { turn } = await run.step();
    expect(turn).toBe(1);
    expect(seen).toContain("turn");
    const packet = run.observation("atlantic-federation");
    expect(packet.actorId).toBe("atlantic-federation");
    expect(JSON.stringify(packet)).not.toContain("TrueWorldState");
  });

  it("possess-wait then submitAction completes think", async () => {
    const engine = await openEngine(dir, {
      think: async ({ packet }) => ({ actorId: packet.actorId, type: "wait", params: {} }),
    });
    const run = await engine.start({
      seed: 1,
      stance: "possess",
      possessNodeId: "atlantic-federation",
    });
    const waits: InstrumentMsg[] = [];
    run.subscribe((m) => {
      if (m.type === "possess-wait") waits.push(m);
    });
    const stepping = run.step();
    await new Promise((r) => setTimeout(r, 20));
    expect(waits.length).toBeGreaterThan(0);
    const wait = waits[0];
    if (wait && wait.type === "possess-wait") {
      await run.submitAction({ actorId: wait.packet.actorId, type: "wait", params: {} });
    }
    const { turn } = await stepping;
    expect(turn).toBe(1);
  });

  it("emits English error when no think is configured", async () => {
    const engine = await openEngine(dir);
    const run = await engine.start({ seed: 1 });
    const messages: string[] = [];
    run.subscribe((m) => {
      if (m.type === "error") messages.push(m.message);
    });
    await expect(run.step()).rejects.toThrow(
      "No language model is configured. Possess the agent or set an API key.",
    );
    expect(messages).toContain(
      "No language model is configured. Possess the agent or set an API key.",
    );
  });
});

describe("openEngineFromProject", () => {
  it("compiles a loaded project", async () => {
    const project = await loadProject(dir);
    const engine = openEngineFromProject(project, { think: waitThink });
    const compiled = engine.compile();
    expect(compiled.ok).toBe(true);
  });
});

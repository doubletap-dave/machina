import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  kindNoRuntimeCopy,
  kindUnpinnedFileCopy,
  type KindManifest,
  type MachinaProject,
  type InstrumentMsg,
} from "@machina/core";
import { loadProject, saveProject } from "@machina/persistence";
import { emptyCredentials } from "../src/credentials.ts";
import { openEngine, openEngineFromProject } from "../src/engine.ts";
import * as listModels from "../src/list-models.ts";

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
    const engine = await openEngine(dir, { credentials: emptyCredentials() });
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

  it("pause refuses step until resume", async () => {
    const engine = await openEngine(dir, { think: waitThink });
    const run = await engine.start({ seed: 7 });
    const { turn } = await run.step();
    expect(turn).toBe(1);
    run.pause();
    await expect(run.step()).rejects.toThrow("The world is paused.");
    expect(run.getSummary().turn).toBe(1);
    run.resume();
    const next = await run.step();
    expect(next.turn).toBe(2);
  });

  it("pauses after missing think so the next step does not advance", async () => {
    const engine = await openEngine(dir, { credentials: emptyCredentials() });
    const run = await engine.start({ seed: 1 });
    await expect(run.step()).rejects.toThrow(
      "No language model is configured. Possess the agent or set an API key.",
    );
    const turnAfterFail = run.getSummary().turn;
    await expect(run.step()).rejects.toThrow("The world is paused.");
    expect(run.getSummary().turn).toBe(turnAfterFail);
  });

  it("applies a God intervention on the next step", async () => {
    const engine = await openEngine(dir, { think: waitThink });
    const run = await engine.start({ seed: 7 });
    run.pause();
    run.applyIntervention({
      path: "actors.atlantic-federation.resources.economy",
      value: 10,
      noticeable: false,
    });
    const { turn } = await run.step();
    expect(turn).toBe(1);
  });

  it("refuses the next step if think fails after a God edit", async () => {
    const engine = await openEngine(dir, { credentials: emptyCredentials() });
    const run = await engine.start({ seed: 1 });
    run.pause();
    run.applyIntervention({
      path: "actors.atlantic-federation.resources.economy",
      value: 10,
      noticeable: false,
    });
    await expect(run.step()).rejects.toThrow(
      "No language model is configured. Possess the agent or set an API key.",
    );
    const turnAfterFail = run.getSummary().turn;
    await expect(run.step()).rejects.toThrow("The world is paused.");
    expect(run.getSummary().turn).toBe(turnAfterFail);
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

describe("injected think", () => {
  it("is used and never calls list-models", async () => {
    const listSpy = vi.spyOn(listModels, "listAndVerify");
    const think = vi.fn(waitThink);
    const engine = await openEngine(dir, { think });
    const run = await engine.start({ seed: 7 });
    const { turn } = await run.step();
    expect(turn).toBe(1);
    expect(think).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
    listSpy.mockRestore();
  });

  it("uses createLlmThink when think is omitted", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "wait", params: {} }),
    );
    const engine = await openEngine(dir, {
      invokeChat,
      credentials: {
        schemaVersion: 1,
        default: { provider: "openai", model: "gpt-4o" },
        providers: {
          openai: {
            apiKey: "sk-test",
            last4: "test",
            verifiedAt: "2026-08-24T00:00:00.000Z",
            models: [],
          },
        },
      },
    });
    const run = await engine.start({ seed: 7 });
    const { turn } = await run.step();
    expect(turn).toBe(1);
    expect(invokeChat).toHaveBeenCalled();
  });
});

const fooKind: KindManifest = {
  schemaVersion: 1,
  id: "custom.foo",
  version: 1,
  name: "Foo",
  category: "Systems",
  cardColor: "#112233",
  ports: {
    tick: {
      name: "tick",
      dir: "in",
      type: "CLOCK",
      cardinality: "exclusive",
      label: "when time moves",
    },
  },
  fields: [],
};

function clockNode() {
  return {
    id: "clock",
    kind: "control.clock",
    version: 1,
    position: { x: 0, y: 0 },
    config: { period: "month" },
  };
}

function customFooProject(): MachinaProject {
  return {
    schemaVersion: 1,
    id: "foo-world",
    name: "Foo",
    entryGraphId: "g",
    presetRefs: [],
    graphs: [
      {
        id: "g",
        nodes: [
          clockNode(),
          {
            id: "foo",
            kind: "custom.foo",
            version: 1,
            position: { x: 0, y: 0 },
            config: {},
          },
        ],
        edges: [
          {
            id: "e-clock-foo",
            sourceNode: "clock",
            sourcePort: "tick",
            targetNode: "foo",
            targetPort: "tick",
          },
        ],
      },
    ],
  };
}

function starterClockWorldLogger(): MachinaProject {
  return {
    schemaVersion: 1,
    id: "starter",
    name: "Starter",
    entryGraphId: "entry",
    presetRefs: [],
    graphs: [
      {
        id: "entry",
        nodes: [
          clockNode(),
          {
            id: "world",
            kind: "entities.world",
            version: 1,
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "logger",
            kind: "analysis.logger",
            version: 1,
            position: { x: 0, y: 0 },
            config: {},
          },
        ],
        edges: [
          {
            id: "clock-world",
            sourceNode: "clock",
            sourcePort: "tick",
            targetNode: "world",
            targetPort: "tick",
          },
        ],
      },
    ],
  };
}

describe("authoring kinds", () => {
  it("compiles custom.foo when CLOCK-in is wired from clock", () => {
    const engine = openEngineFromProject(customFooProject(), {
      kinds: [fooKind],
      think: waitThink,
    });
    const compiled = engine.compile();
    expect(compiled.ok).toBe(true);
  });

  it("refuses start when custom.foo has no runtime", async () => {
    const engine = openEngineFromProject(customFooProject(), {
      kinds: [fooKind],
      think: waitThink,
    });
    await expect(engine.start({ seed: 1 })).rejects.toThrow(
      kindNoRuntimeCopy("Foo", "custom.foo"),
    );
  });

  it("starts starter clock+world+logger with injected think", async () => {
    const engine = openEngineFromProject(starterClockWorldLogger(), {
      think: waitThink,
    });
    const run = await engine.start({ seed: 1 });
    const { turn } = await run.step();
    expect(turn).toBe(1);
  });

  it("surfaces verifyProjectKinds errors from compile", async () => {
    const dir = join(
      tmpdir(),
      `machina-engine-kinds-${randomBytes(8).toString("hex")}`,
    );
    await saveProject(dir, starterClockWorldLogger());
    await mkdir(join(dir, "kinds"), { recursive: true });
    await writeFile(
      join(dir, "kinds", "custom.foo.json"),
      JSON.stringify(fooKind),
    );
    const engine = await openEngine(dir, { think: waitThink });
    const compiled = engine.compile();
    expect(compiled.ok).toBe(false);
    if (!compiled.ok) {
      expect(compiled.errors).toContainEqual({
        code: "KIND_UNPINNED_FILE",
        message: kindUnpinnedFileCopy(),
      });
    }
  });
});

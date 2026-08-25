import type { Server } from "node:http";
import { describe, expect, it } from "vitest";
import type { InstrumentMsg, MachinaProject } from "@machina/core";
import { openEngineFromProject } from "@machina/engine";
import { compile } from "@machina/graph";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { createApp } from "@machina/runtime";
import { MachinaClient } from "../src/client.ts";

const project: MachinaProject = {
  schemaVersion: 1,
  id: "p1",
  name: "Test",
  entryGraphId: "g1",
  presetRefs: [],
  graphs: [
    {
      id: "g1",
      nodes: [
        {
          id: "clock",
          kind: "control.clock",
          version: 1,
          position: { x: 0, y: 0 },
          config: { tick: "month" },
        },
      ],
      edges: [],
    },
  ],
};

const waitThink = async ({ packet }: { packet: { actorId: string } }) => ({
  actorId: packet.actorId,
  type: "wait",
  params: {},
});

function realCompile(project: MachinaProject) {
  const registry = createRegistry();
  registerCoreKinds(registry);
  const result = compile(project, registry);
  if ("errors" in result) {
    return { errors: result.errors };
  }
  return { errors: [] as [], plan: result.plan };
}

function runtimeDeps() {
  return {
    compile: realCompile,
    openEngineFromProject,
    think: waitThink,
    loadExampleProject: async () => project,
  };
}

async function withServer(
  fn: (client: MachinaClient) => Promise<void>,
): Promise<void> {
  const server: Server = createApp(runtimeDeps());
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected bound TCP port");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const client = new MachinaClient({ baseUrl });
  try {
    await fn(client);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("MachinaClient", () => {
  it("compiles a clock project", async () => {
    await withServer(async (client) => {
      const compiled = await client.compile(project);
      expect(compiled.ok).toBe(true);
    });
  });

  it("maps compile HTTP errors to ok false", async () => {
    const empty: MachinaProject = {
      ...project,
      graphs: [{ id: "g1", nodes: [], edges: [] }],
    };
    await withServer(async (client) => {
      const compiled = await client.compile(empty);
      expect(compiled.ok).toBe(false);
      if (!compiled.ok) {
        expect(compiled.errors.length).toBeGreaterThan(0);
      }
    });
  });

  it("starts a run and steps to turn 1", async () => {
    await withServer(async (client) => {
      const { id } = await client.startRun({ project, seed: 1 });
      const { turn } = await client.step(id);
      expect(turn).toBe(1);
    });
  });

  it("subscribe receives turn", async () => {
    await withServer(async (client) => {
      const seen: InstrumentMsg[] = [];
      const unsubscribe = client.subscribe((msg) => seen.push(msg));
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const { id } = await client.startRun({ project, seed: 1 });
        await client.step(id);
        await expect.poll(() => seen.some((msg) => msg.type === "turn")).toBe(true);
      } finally {
        unsubscribe();
      }
    });
  });
});

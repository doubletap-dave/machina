import { describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { resolve } from "node:path";
import { kindNoRuntimeCopy, type KindManifest, type MachinaProject } from "@machina/core";
import { openEngineFromProject } from "@machina/engine";
import { compile } from "@machina/graph";
import { loadProject } from "@machina/persistence";
import { createRegistry, kindManifestToDefinition } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { ThinkFn } from "@machina/simulation";
import { createApp } from "../src/app.ts";

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

const plan = {
  projectId: "p1",
  clock: { nodeId: "clock", config: { tick: "month" } },
  systems: [],
  agents: [],
  perception: [],
  analysis: [],
};

const waitThink: ThinkFn = async ({ packet }) => ({
  actorId: packet.actorId,
  type: "wait",
  params: {},
});

const exampleDir = resolve(import.meta.dirname, "../../../examples/dead-channel-lite");

function engineDeps() {
  return {
    compile: () => ({ errors: [] as [], plan }),
    openEngineFromProject,
    think: waitThink,
  };
}

async function withServer(
  deps: Parameters<typeof createApp>[0],
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const server: Server = createApp(deps);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected bound TCP port");
  }
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await fn(base);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("HTTP control plane", () => {
  it("returns 400 when compile reports errors", async () => {
    await withServer(
      {
        compile: () => ({
          errors: [{ message: "This world needs a Clock before it can run." }],
        }),
      },
      async (base) => {
        const response = await fetch(`${base}/compile`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(project),
        });
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.errors[0].message).toBe(
          "This world needs a Clock before it can run.",
        );
      },
    );
  });

  it("returns 200 with plan when compile succeeds", async () => {
    await withServer(
      {
        compile: () => ({ errors: [], plan }),
      },
      async (base) => {
        const response = await fetch(`${base}/compile`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(project),
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.plan).toEqual(plan);
      },
    );
  });

  it("returns 503 when the engine opener is missing", async () => {
    await withServer(
      {
        compile: () => ({ errors: [], plan }),
      },
      async (base) => {
        const response = await fetch(`${base}/runs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project, seed: 1 }),
        });
        expect(response.status).toBe(503);
        expect((await response.json()).message).toBe("Runtime piece not ready.");
      },
    );
  });

  it("allows interventions only while paused", async () => {
    await withServer(engineDeps(), async (base) => {
      const create = await fetch(`${base}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, seed: 1 }),
      });
      expect(create.status).toBe(200);
      const { id } = (await create.json()) as { id: string };

      const blocked = await fetch(`${base}/runs/${id}/interventions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "set", path: "x", value: 1 }),
      });
      expect(blocked.status).toBe(409);
      expect((await blocked.json()).message).toBe(
        "Pause the world before changing it.",
      );

      await fetch(`${base}/runs/${id}/pause`, { method: "POST" });

      const allowed = await fetch(`${base}/runs/${id}/interventions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "set", path: "x", value: 1 }),
      });
      expect(allowed.status).toBe(200);
    });
  });

  it("returns example world when configured", async () => {
    await withServer(
      {
        compile: () => ({ errors: [], plan }),
        loadExampleProject: async () => project,
      },
      async (base) => {
        const response = await fetch(`${base}/examples/world`);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.name).toBe("Test");
      },
    );
  });

  it("steps a run and returns turn summary", async () => {
    await withServer(engineDeps(), async (base) => {
      const create = await fetch(`${base}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, seed: 42 }),
      });
      const { id } = (await create.json()) as { id: string };

      const step = await fetch(`${base}/runs/${id}/step`, { method: "POST" });
      expect(step.status).toBe(200);
      expect((await step.json()).turn).toBe(1);

      const summary = await fetch(`${base}/runs/${id}`);
      expect(summary.status).toBe(200);
      const body = await summary.json();
      expect(body).toEqual({ id, turn: 1, cost: 0, errors: [] });
    });
  });

  it("accepts a possess action and finishes the turn", async () => {
    const world = await loadProject(exampleDir);
    await withServer(engineDeps(), async (base) => {
      const create = await fetch(`${base}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: world,
          seed: 1,
          stance: "possess",
          possessNodeId: "atlantic-federation",
        }),
      });
      expect(create.status).toBe(200);
      const { id } = (await create.json()) as { id: string };

      const stepping = fetch(`${base}/runs/${id}/step`, { method: "POST" });
      const raced = await Promise.race([
        stepping.then(() => "step" as const),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 80)),
      ]);
      expect(raced).toBe("timeout");

      const action = await fetch(`${base}/runs/${id}/possess/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorId: "atlantic-federation",
          type: "wait",
          params: {},
        }),
      });
      expect(action.status).toBe(200);

      const step = await stepping;
      expect(step.status).toBe(200);
      expect((await step.json()).turn).toBe(1);

      const summary = await fetch(`${base}/runs/${id}`);
      expect((await summary.json()).turn).toBe(1);
    });
  });

  it("compiles a custom kind then refuses start without runtime", async () => {
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
    const fooProject: MachinaProject = {
      schemaVersion: 1,
      id: "foo-world",
      name: "Foo",
      entryGraphId: "g",
      presetRefs: [],
      graphs: [
        {
          id: "g",
          nodes: [
            {
              id: "clock",
              kind: "control.clock",
              version: 1,
              position: { x: 0, y: 0 },
              config: { period: "month" },
            },
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

    await withServer(
      {
        compile(project, kinds = []) {
          const registry = createRegistry();
          registerCoreKinds(registry);
          for (const kind of kinds) {
            registry.register(kindManifestToDefinition(kind));
          }
          const result = compile(project, registry);
          if ("errors" in result) {
            return { errors: result.errors };
          }
          return { errors: [] as [], plan: result.plan };
        },
        openEngineFromProject,
        think: waitThink,
      },
      async (base) => {
        const compiled = await fetch(`${base}/compile`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project: fooProject, kinds: [fooKind] }),
        });
        expect(compiled.status).toBe(200);

        const started = await fetch(`${base}/runs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project: fooProject, seed: 1, kinds: [fooKind] }),
        });
        expect(started.status).toBe(400);
        const body = (await started.json()) as { message: string };
        expect(body.message).toBe(kindNoRuntimeCopy("Foo", "custom.foo"));
      },
    );
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { MachinaProject } from "@machina/core";
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

  it("allows interventions only while paused", async () => {
    await withServer(
      {
        compile: () => ({ errors: [], plan }),
      },
      async (base) => {
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
      },
    );
  });

  it("steps a run and returns turn summary", async () => {
    await withServer(
      {
        compile: () => ({ errors: [], plan }),
      },
      async (base) => {
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
      },
    );
  });
});

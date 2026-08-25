import { access, mkdtemp } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { InstrumentMsg, KindManifest, MachinaProject } from "@machina/core";
import { keyRefusedCopy } from "@machina/core";
import {
  credentialsPath,
  openEngineFromProject,
  type InvokeChat,
} from "@machina/engine";
import { compile } from "@machina/graph";
import { createRegistry, kindManifestToDefinition } from "@machina/node-sdk";
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

function realCompile(project: MachinaProject, kinds: KindManifest[] = []) {
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
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async () => jsonResponse(status, body)) as typeof fetch;
}

function runtimeDeps(extra?: {
  homedir?: string;
  fetch?: typeof fetch;
  env?: NodeJS.Dict<string>;
  invokeChat?: InvokeChat;
}) {
  return {
    compile: realCompile,
    openEngineFromProject,
    think: waitThink,
    loadExampleProject: async () => project,
    homedir: extra?.homedir,
    fetch: extra?.fetch,
    env: extra?.env ?? {},
    invokeChat: extra?.invokeChat,
  };
}

async function withServer(
  fn: (client: MachinaClient) => Promise<void>,
  extra?: Parameters<typeof runtimeDeps>[0],
): Promise<void> {
  const server: Server = createApp(runtimeDeps(extra));
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

  it("applyIntervention posts path value and noticeable", async () => {
    const posted: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      posted.push({ url: String(input), init });
      return jsonResponse(200, { ok: true });
    }) as typeof fetch;
    const previous = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const client = new MachinaClient({ baseUrl: "http://127.0.0.1:9" });
      await client.applyIntervention("run-1", {
        path: "actors.a.resources.economy",
        value: 10,
        noticeable: true,
      });
    } finally {
      globalThis.fetch = previous;
    }
    expect(posted).toEqual([
      {
        url: "http://127.0.0.1:9/runs/run-1/interventions",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path: "actors.a.resources.economy",
            value: 10,
            noticeable: true,
          }),
        },
      },
    ]);
  });

  it("getTruth is 403 until stance is god", async () => {
    await withServer(async (client) => {
      const { id } = await client.startRun({ project, seed: 1 });
      await expect(client.getTruth(id)).rejects.toThrow("God stance sees truth.");
      await client.setStance(id, "god");
      const view = await client.getTruth(id);
      expect(view.turn).toBe(0);
      expect(view.actors).toEqual({});
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

  it("getSettings JSON never includes apiKey", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    await withServer(
      async (client) => {
        const settings = await client.getSettings();
        expect(JSON.stringify(settings).includes("apiKey")).toBe(false);
        expect(settings.default).toBeNull();
      },
      { homedir, fetch: stubFetch(200, { data: [] }), env: {} },
    );
  });

  it("putProviderKey, putDefault, refreshProvider, and deleteProvider round-trip", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    const apiKey = "sk-test-abcd";
    await withServer(
      async (client) => {
        const saved = await client.putProviderKey("openai", apiKey);
        expect(JSON.stringify(saved).includes("apiKey")).toBe(false);
        expect(saved.verified).toBe(true);
        expect(saved.last4).toBe("abcd");

        await client.putDefault({ provider: "openai", model: "gpt-4o" });
        const afterDefault = await client.getSettings();
        expect(afterDefault.default).toEqual({
          provider: "openai",
          model: "gpt-4o",
        });

        const refreshed = await client.refreshProvider("openai");
        expect(refreshed.verified).toBe(true);

        await client.deleteProvider("openai");
        const afterDelete = await client.getSettings();
        expect(afterDelete.default).toBeNull();
        expect(afterDelete.providers.openai.configured).toBe(false);
      },
      {
        homedir,
        fetch: stubFetch(200, { data: [{ id: "gpt-4o" }] }),
        env: {},
      },
    );
  });

  it("putProviderKey surfaces This key was refused on 401 stub", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    await withServer(
      async (client) => {
        const slice = await client.putProviderKey("openai", "sk-bad-abcd");
        expect(slice.message).toBe(keyRefusedCopy());
        expect(slice.verified).toBe(false);
        expect(JSON.stringify(slice).includes("apiKey")).toBe(false);
      },
      {
        homedir,
        fetch: stubFetch(401, { error: "unauthorized" }),
        env: {},
      },
    );
  });

  it("OPENAI_API_KEY makes getSettings configured without writing the file", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    await withServer(
      async (client) => {
        const settings = await client.getSettings();
        expect(settings.providers.openai.configured).toBe(true);
        expect(JSON.stringify(settings).includes("apiKey")).toBe(false);
      },
      {
        homedir,
        fetch: stubFetch(200, { data: [] }),
        env: { OPENAI_API_KEY: "sk-env-abcd" },
      },
    );
    await expect(access(credentialsPath({ homedir }))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("compose returns English errors when no verified default is set", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    await withServer(
      async (client) => {
        const result = await client.compose("a clock", project);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors.some((error) => /no language model is configured/i.test(error.message))).toBe(
            true,
          );
        }
      },
      { homedir, fetch: stubFetch(200, { data: [] }), env: {} },
    );
  });

  it("compose posts the prompt and project and returns a composed graph", async () => {
    const homedir = await mkdtemp(join(tmpdir(), "machina-client-"));
    await withServer(
      async (client) => {
        await client.putProviderKey("openai", "sk-test-abcd");
        await client.putDefault({ provider: "openai", model: "gpt-4o" });
        const result = await client.compose("keep this clock", project);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.project.graphs[0]?.nodes.some((node) => node.kind === "control.clock")).toBe(
            true,
          );
        }
      },
      {
        homedir,
        fetch: stubFetch(200, { data: [{ id: "gpt-4o" }] }),
        env: {},
        invokeChat: async () => JSON.stringify(project),
      },
    );
  });
});

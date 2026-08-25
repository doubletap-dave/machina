import { access, mkdtemp } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { describeNoLlmCopy, type MachinaProject } from "@machina/core";
import { credentialsPath, type InvokeChat } from "@machina/engine";
import { createApp, type RuntimeDeps } from "../src/app.ts";

const withClock: MachinaProject = {
  schemaVersion: 1,
  id: "p",
  name: "Clock world",
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
      ],
      edges: [],
    },
  ],
};

const plan = {
  projectId: "p",
  clock: { nodeId: "clock", config: { period: "month" } },
  systems: [],
  agents: [],
  perception: [],
  analysis: [],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async () => jsonResponse(status, body)) as typeof fetch;
}

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "machina-compose-"));
}

function deps(opts: {
  homedir: string;
  invokeChat?: InvokeChat;
}): RuntimeDeps {
  return {
    compile: () => ({ errors: [] as [], plan }),
    homedir: opts.homedir,
    fetch: stubFetch(200, { data: [{ id: "gpt-4o" }] }),
    env: {},
    invokeChat: opts.invokeChat,
  };
}

async function withServer(
  runtimeDeps: RuntimeDeps,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const server: Server = createApp(runtimeDeps);
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

async function saveVerifiedDefault(base: string): Promise<void> {
  await fetch(`${base}/settings/providers/openai`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ apiKey: "sk-test-abcd" }),
  });
  await fetch(`${base}/settings/default`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
  });
}

describe("POST /compose", () => {
  it("returns 400 English when there is no verified default", async () => {
    const homedir = await tempHome();
    const invokeChat = vi.fn(async () => JSON.stringify(withClock));
    await withServer(deps({ homedir, invokeChat }), async (base) => {
      const response = await fetch(`${base}/compose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "a clock", project: withClock }),
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as { message?: string };
      expect(body.message).toBe(describeNoLlmCopy());
      expect(invokeChat).not.toHaveBeenCalled();
    });
    await expect(access(credentialsPath({ homedir }))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("uses the default LLM as proposer through composeFromDescription", async () => {
    const homedir = await tempHome();
    const invokeChat = vi.fn(async () => JSON.stringify(withClock));
    await withServer(deps({ homedir, invokeChat }), async (base) => {
      await saveVerifiedDefault(base);
      const response = await fetch(`${base}/compose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "a clock", project: withClock }),
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as { project?: MachinaProject };
      expect(body.project?.graphs[0]?.nodes.some((node) => node.kind === "control.clock")).toBe(
        true,
      );
      expect(invokeChat).toHaveBeenCalled();
      const args = invokeChat.mock.calls[0]![0];
      expect(args.provider).toBe("openai");
      expect(args.model).toBe("gpt-4o");
      expect(args.prompt).toContain("control.clock");
      expect(args.prompt).toContain("a clock");
    });
  });
});

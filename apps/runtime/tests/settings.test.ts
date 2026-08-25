import { access, mkdtemp } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { keyRefusedCopy } from "@machina/core";
import {
  credentialsPath,
  loadCredentials,
  type CachedModel,
} from "@machina/engine";
import { createApp, type RuntimeDeps } from "../src/app.ts";

const plan = {
  projectId: "p1",
  clock: { nodeId: "clock", config: { tick: "month" } },
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

const gptModels: CachedModel[] = [{ id: "gpt-4o", name: "gpt-4o" }];

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "machina-settings-"));
}

function settingsDeps(opts: {
  homedir: string;
  fetch?: typeof fetch;
  env?: NodeJS.Dict<string>;
}): RuntimeDeps {
  return {
    compile: () => ({ errors: [] as [], plan }),
    homedir: opts.homedir,
    fetch: opts.fetch ?? stubFetch(200, { data: gptModels }),
    env: opts.env ?? {},
  };
}

async function withServer(
  deps: RuntimeDeps,
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

describe("settings HTTP", () => {
  it("GET /settings/models never includes apiKey", async () => {
    const homedir = await tempHome();
    await withServer(settingsDeps({ homedir }), async (base) => {
      const response = await fetch(`${base}/settings/models`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(JSON.stringify(body).includes("apiKey")).toBe(false);
      expect(body.default).toBeNull();
      expect(body.providers.openai.configured).toBe(false);
      expect(body.providers.anthropic.configured).toBe(false);
      expect(body.providers.openrouter.configured).toBe(false);
      expect(body.providers.perplexity.configured).toBe(false);
    });
  });

  it("PUT then GET strips the key; 200 verify caches models", async () => {
    const homedir = await tempHome();
    const apiKey = "sk-test-abcd";
    await withServer(
      settingsDeps({
        homedir,
        fetch: stubFetch(200, { data: [{ id: "gpt-4o" }] }),
      }),
      async (base) => {
        const put = await fetch(`${base}/settings/providers/openai`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });
        expect(put.status).toBe(200);
        const putBody = await put.json();
        expect(JSON.stringify(putBody).includes("apiKey")).toBe(false);
        expect(JSON.stringify(putBody)).not.toContain(apiKey);
        expect(putBody.configured).toBe(true);
        expect(putBody.verified).toBe(true);
        expect(putBody.last4).toBe("abcd");
        expect(putBody.models).toEqual([{ id: "gpt-4o", name: "gpt-4o" }]);

        const get = await fetch(`${base}/settings/models`);
        const body = await get.json();
        expect(JSON.stringify(body).includes("apiKey")).toBe(false);
        expect(JSON.stringify(body)).not.toContain(apiKey);
        expect(body.providers.openai).toMatchObject({
          configured: true,
          verified: true,
          last4: "abcd",
          models: [{ id: "gpt-4o", name: "gpt-4o" }],
        });
      },
    );
  });

  it("401 stub still saves the key and returns This key was refused", async () => {
    const homedir = await tempHome();
    const apiKey = "sk-bad-abcd";
    await withServer(
      settingsDeps({
        homedir,
        fetch: stubFetch(401, { error: "unauthorized" }),
      }),
      async (base) => {
        const put = await fetch(`${base}/settings/providers/openai`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey }),
        });
        expect(put.status).toBe(200);
        const putBody = await put.json();
        expect(putBody.message).toBe(keyRefusedCopy());
        expect(putBody.verified).toBe(false);
        expect(JSON.stringify(putBody).includes("apiKey")).toBe(false);

        const loaded = await loadCredentials({ homedir });
        expect(loaded.file.providers.openai?.apiKey).toBe(apiKey);
        expect(loaded.file.providers.openai?.verifiedAt).toBeNull();
      },
    );
  });

  it("OPENAI_API_KEY makes configured true without writing the file", async () => {
    const homedir = await tempHome();
    await withServer(
      settingsDeps({
        homedir,
        env: { OPENAI_API_KEY: "sk-env-abcd" },
        fetch: (async () => {
          throw new Error("GET must not list-models for env overlay");
        }) as typeof fetch,
      }),
      async (base) => {
        const response = await fetch(`${base}/settings/models`);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.providers.openai.configured).toBe(true);
        expect(body.providers.openai.last4).toBe("abcd");
        expect(body.providers.openai.verified).toBe(false);
        expect(JSON.stringify(body).includes("apiKey")).toBe(false);
        expect(JSON.stringify(body)).not.toContain("sk-env-abcd");
      },
    );
    await expect(access(credentialsPath({ homedir }))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("PUT empty key or unknown id returns 400", async () => {
    const homedir = await tempHome();
    await withServer(settingsDeps({ homedir }), async (base) => {
      const empty = await fetch(`${base}/settings/providers/openai`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: "   " }),
      });
      expect(empty.status).toBe(400);
      expect(typeof (await empty.json()).message).toBe("string");

      const unknown = await fetch(`${base}/settings/providers/not-a-provider`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: "sk-ok" }),
      });
      expect(unknown.status).toBe(400);
    });
  });

  it("DELETE returns 204 and clears default when it pointed at that provider", async () => {
    const homedir = await tempHome();
    await withServer(settingsDeps({ homedir }), async (base) => {
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

      const del = await fetch(`${base}/settings/providers/openai`, {
        method: "DELETE",
      });
      expect(del.status).toBe(204);

      const get = await fetch(`${base}/settings/models`);
      const body = await get.json();
      expect(body.default).toBeNull();
      expect(body.providers.openai.configured).toBe(false);
    });
  });

  it("POST refresh lists again; 400 if no key", async () => {
    const homedir = await tempHome();
    await withServer(settingsDeps({ homedir }), async (base) => {
      const missing = await fetch(`${base}/settings/providers/openai/refresh`, {
        method: "POST",
      });
      expect(missing.status).toBe(400);

      await fetch(`${base}/settings/providers/openai`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: "sk-test-abcd" }),
      });
      const refreshed = await fetch(`${base}/settings/providers/openai/refresh`, {
        method: "POST",
      });
      expect(refreshed.status).toBe(200);
      const slice = await refreshed.json();
      expect(slice.verified).toBe(true);
      expect(JSON.stringify(slice).includes("apiKey")).toBe(false);
    });
  });

  it("PUT /settings/default is 400 if not verified or model not in cache", async () => {
    const homedir = await tempHome();
    await withServer(
      settingsDeps({
        homedir,
        fetch: stubFetch(401, { error: "unauthorized" }),
      }),
      async (base) => {
        await fetch(`${base}/settings/providers/openai`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey: "sk-bad-abcd" }),
        });
        const unverified = await fetch(`${base}/settings/default`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
        });
        expect(unverified.status).toBe(400);
      },
    );

    const homedirOk = await tempHome();
    await withServer(
      settingsDeps({
        homedir: homedirOk,
        fetch: stubFetch(200, { data: [{ id: "gpt-4o" }] }),
      }),
      async (base) => {
        await fetch(`${base}/settings/providers/openai`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey: "sk-test-abcd" }),
        });
        const missingModel = await fetch(`${base}/settings/default`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "openai", model: "nope" }),
        });
        expect(missingModel.status).toBe(400);

        const ok = await fetch(`${base}/settings/default`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
        });
        expect(ok.status).toBe(200);
        const get = await fetch(`${base}/settings/models`);
        expect((await get.json()).default).toEqual({
          provider: "openai",
          model: "gpt-4o",
        });
      },
    );
  });
});

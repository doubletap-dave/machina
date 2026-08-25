import type { IncomingMessage, ServerResponse } from "node:http";
import {
  apiKeyFromEnv,
  isProviderId,
  last4,
  listAndVerify,
  loadCredentials,
  PROVIDER_IDS,
  publicProviderView,
  saveCredentials,
  type CachedModel,
  type CredentialsFile,
  type ProviderId,
  type PublicProviderView,
} from "@machina/engine";

export type SettingsDeps = {
  homedir?: string;
  fetchImpl: typeof fetch;
  env: NodeJS.Dict<string>;
};

type EnvCache = { verifiedAt: string | null; models: CachedModel[] };

export type PublicProviderSlice = PublicProviderView & { message?: string };

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function resolveKey(
  id: ProviderId,
  file: CredentialsFile,
  env: NodeJS.Dict<string>,
): { apiKey: string; fromEnv: boolean } | undefined {
  const fromEnv = apiKeyFromEnv(id, env);
  if (fromEnv) {
    return { apiKey: fromEnv, fromEnv: true };
  }
  const fromFile = file.providers[id]?.apiKey;
  if (fromFile) {
    return { apiKey: fromFile, fromEnv: false };
  }
  return undefined;
}

function sliceFor(
  id: ProviderId,
  file: CredentialsFile,
  env: NodeJS.Dict<string>,
  memory: Partial<Record<ProviderId, EnvCache>>,
): PublicProviderView {
  const envKey = apiKeyFromEnv(id, env);
  if (envKey) {
    const mem = memory[id];
    return {
      configured: true,
      verified: mem?.verifiedAt != null,
      last4: last4(envKey),
      models: mem?.models ?? [],
    };
  }
  return publicProviderView(file.providers[id]);
}

export function createSettingsHandler(
  deps: SettingsDeps,
): (req: IncomingMessage, res: ServerResponse) => Promise<boolean> {
  const credOpts = { homedir: deps.homedir };
  const memory: Partial<Record<ProviderId, EnvCache>> = {};

  async function applyList(
    id: ProviderId,
    apiKey: string,
    fromEnv: boolean,
    file: CredentialsFile,
  ): Promise<PublicProviderSlice> {
    const result = await listAndVerify(id, apiKey, deps.fetchImpl);
    const verifiedAt = result.ok ? new Date().toISOString() : null;
    const models = result.ok ? result.models : [];
    if (fromEnv) {
      memory[id] = { verifiedAt, models };
    } else {
      const current = file.providers[id];
      if (current) {
        current.verifiedAt = verifiedAt;
        current.models = models;
        await saveCredentials(file, credOpts);
      }
    }
    const slice: PublicProviderSlice = fromEnv
      ? {
          configured: true,
          verified: verifiedAt !== null,
          last4: last4(apiKey),
          models,
        }
      : publicProviderView(file.providers[id]);
    if (!result.ok) {
      slice.message = result.message;
    }
    return slice;
  }

  return async (req, res) => {
    const method = req.method ?? "GET";
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    if (!path.startsWith("/settings")) {
      return false;
    }

    const loaded = await loadCredentials(credOpts);
    const file = loaded.file;

    if (method === "GET" && path === "/settings/models") {
      const providers: Record<string, PublicProviderView> = {};
      for (const id of PROVIDER_IDS) {
        providers[id] = sliceFor(id, file, deps.env, memory);
      }
      const body: {
        default: CredentialsFile["default"];
        providers: Record<string, PublicProviderView>;
        message?: string;
      } = { default: file.default, providers };
      if (loaded.unreadable && loaded.message) {
        body.message = loaded.message;
      }
      sendJson(res, 200, body);
      return true;
    }

    if (method === "PUT" && path === "/settings/default") {
      const body = await readJson<{ provider?: unknown; model?: unknown }>(req);
      const providerRaw = String(body.provider ?? "");
      if (!isProviderId(providerRaw)) {
        sendJson(res, 400, { message: "That provider is not known." });
        return true;
      }
      if (typeof body.model !== "string" || body.model.length === 0) {
        sendJson(res, 400, { message: "That model is not on the verified list." });
        return true;
      }
      const model = body.model;
      const view = sliceFor(providerRaw, file, deps.env, memory);
      if (!view.verified) {
        sendJson(res, 400, { message: "That provider is not verified." });
        return true;
      }
      if (!view.models.some((entry) => entry.id === model)) {
        sendJson(res, 400, { message: "That model is not on the verified list." });
        return true;
      }
      file.default = { provider: providerRaw, model };
      await saveCredentials(file, credOpts);
      sendJson(res, 200, { default: file.default });
      return true;
    }

    const providerMatch = path.match(/^\/settings\/providers\/([^/]+)$/);
    if (providerMatch) {
      const idRaw = providerMatch[1]!;
      if (!isProviderId(idRaw)) {
        sendJson(res, 400, { message: "That provider is not known." });
        return true;
      }
      const id = idRaw;

      if (method === "PUT") {
        const body = await readJson<{ apiKey?: unknown }>(req);
        const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
        if (!apiKey) {
          sendJson(res, 400, { message: "The API key is empty." });
          return true;
        }
        file.providers[id] = {
          apiKey,
          last4: last4(apiKey),
          verifiedAt: null,
          models: [],
        };
        await saveCredentials(file, credOpts);
        const slice = await applyList(id, apiKey, false, file);
        sendJson(res, 200, slice);
        return true;
      }

      if (method === "DELETE") {
        delete file.providers[id];
        delete memory[id];
        if (file.default?.provider === id) {
          file.default = null;
        }
        await saveCredentials(file, credOpts);
        res.writeHead(204);
        res.end();
        return true;
      }
    }

    const refreshMatch = path.match(/^\/settings\/providers\/([^/]+)\/refresh$/);
    if (method === "POST" && refreshMatch) {
      const idRaw = refreshMatch[1]!;
      if (!isProviderId(idRaw)) {
        sendJson(res, 400, { message: "That provider is not known." });
        return true;
      }
      const resolved = resolveKey(idRaw, file, deps.env);
      if (!resolved) {
        sendJson(res, 400, { message: "No API key is saved for this provider." });
        return true;
      }
      const slice = await applyList(idRaw, resolved.apiKey, resolved.fromEnv, file);
      sendJson(res, 200, slice);
      return true;
    }

    sendJson(res, 404, { message: "Not found." });
    return true;
  };
}

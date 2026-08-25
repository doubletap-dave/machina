import type { IncomingMessage, ServerResponse } from "node:http";
import {
  describeNoLlmCopy,
  type KindManifest,
  type MachinaError,
  type MachinaProject,
} from "@machina/core";
import {
  apiKeyFromEnv,
  langchainInvokeChat,
  loadCredentials,
  type CredentialsFile,
  type InvokeChat,
  type ProviderId,
  type PublicProviderView,
} from "@machina/engine";
import { composeFromDescription } from "@machina/graph";
import { createRegistry, type NodeRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";

type CompileFn = (
  project: MachinaProject,
  kinds?: KindManifest[],
) => { errors: Array<{ message: string }>; plan?: unknown };

export type ComposeDeps = {
  compile: CompileFn;
  homedir?: string;
  env?: NodeJS.Dict<string>;
  invokeChat?: InvokeChat;
  registry?: NodeRegistry;
  providerView: (id: ProviderId, file: CredentialsFile) => PublicProviderView;
};

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

function coreRegistry(): NodeRegistry {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

function invalidProject(): MachinaProject {
  return {
    schemaVersion: 1,
    id: "invalid",
    name: "invalid",
    entryGraphId: "g",
    presetRefs: [],
    graphs: [{ id: "g", nodes: [], edges: [] }],
  };
}

function parseProjectJson(text: string): MachinaProject {
  const candidate = stripFences(text.trim());
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const project = parsed as MachinaProject;
      if (Array.isArray(project.graphs)) {
        return project;
      }
    }
  } catch {
    return invalidProject();
  }
  return invalidProject();
}

function stripFences(text: string): string {
  if (!text.startsWith("```")) {
    return text;
  }
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
}

export async function handleCompose(
  req: IncomingMessage,
  res: ServerResponse,
  deps: ComposeDeps,
): Promise<void> {
  const body = await readJson<{ prompt?: unknown; project?: MachinaProject }>(req);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const currentProject = body.project;
  const loaded = await loadCredentials({ homedir: deps.homedir });
  const file = loaded.file;
  const env = deps.env ?? process.env;
  if (!file.default) {
    sendJson(res, 400, { message: describeNoLlmCopy() });
    return;
  }
  const apiKey =
    file.providers[file.default.provider]?.apiKey ??
    apiKeyFromEnv(file.default.provider, env);
  const view = deps.providerView(file.default.provider, file);
  if (!apiKey || !view.verified) {
    sendJson(res, 400, { message: describeNoLlmCopy() });
    return;
  }

  const invoke = deps.invokeChat ?? langchainInvokeChat;
  const registry = deps.registry ?? coreRegistry();
  const defaultProvider = file.default.provider;
  const defaultModel = file.default.model;
  const fallback = currentProject ?? invalidProject();

  const result = await composeFromDescription(
    prompt,
    registry,
    async (composePrompt, kinds) => {
      const raw = await invoke({
        provider: defaultProvider,
        model: defaultModel,
        apiKey,
        prompt: [
          "Reply with JSON only: a MachinaProject.",
          `Use only these registered kind ids: ${kinds.join(", ")}.`,
          `Operator request: ${composePrompt}`,
          `Current project: ${JSON.stringify(fallback)}`,
        ].join("\n"),
      });
      return parseProjectJson(raw);
    },
    async (project) => {
      const compiled = deps.compile(project);
      return {
        ok: compiled.errors.length === 0,
        message: compiled.errors[0]?.message,
      };
    },
  );

  if ("errors" in result) {
    const errors: MachinaError[] = result.errors;
    sendJson(res, 400, {
      errors,
      message: errors[0]?.message ?? describeNoLlmCopy(),
    });
    return;
  }
  sendJson(res, 200, { project: result.project });
}

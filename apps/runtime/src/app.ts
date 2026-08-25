import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type {
  AgentAction,
  KindManifest,
  MachinaProject,
  SimulationPlan,
} from "@machina/core";
import { openEngineFromProject, type EngineRun, type InvokeChat } from "@machina/engine";
import type { ThinkFn } from "@machina/simulation";
import { toWs } from "./instrumentation.ts";
import { handleCompose } from "./compose.ts";
import { createSettingsHandler } from "./settings.ts";
import { attachWebSocket } from "./ws.ts";

type CompileResult =
  | { errors: Array<{ message: string }>; plan?: undefined }
  | { errors: []; plan: SimulationPlan };

type CompileFn = (
  project: MachinaProject,
  kinds?: KindManifest[],
) => CompileResult;

export type RuntimeDeps = {
  compile: CompileFn;
  openEngineFromProject?: typeof openEngineFromProject;
  think?: ThinkFn;
  loadExampleProject?: () => Promise<MachinaProject>;
  homedir?: string;
  fetch?: typeof fetch;
  env?: NodeJS.Dict<string>;
  invokeChat?: InvokeChat;
};

type Stance = "watch" | "god" | "possess";

type RunRecord = {
  engineRun: EngineRun;
  paused: boolean;
};

export type RuntimeApp = Server & {
  runs: Map<string, RunRecord>;
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

function parseProjectKinds(body: unknown): {
  project: MachinaProject;
  kinds: KindManifest[];
} {
  if (
    body &&
    typeof body === "object" &&
    "project" in body &&
    body.project &&
    typeof body.project === "object" &&
    "graphs" in body.project
  ) {
    const wrapped = body as { project: MachinaProject; kinds?: KindManifest[] };
    return {
      project: wrapped.project,
      kinds: Array.isArray(wrapped.kinds) ? wrapped.kinds : [],
    };
  }
  return { project: body as MachinaProject, kinds: [] };
}

function runPath(url: string): { runId: string; action: string } | null {
  const match = url.match(/^\/runs\/([^/]+)(?:\/(.+))?$/);
  if (!match) {
    return null;
  }
  return { runId: match[1]!, action: match[2] ?? "" };
}

export function createApp(deps: RuntimeDeps): RuntimeApp {
  const runs = new Map<string, RunRecord>();
  const settings = createSettingsHandler({
    homedir: deps.homedir,
    fetchImpl: deps.fetch ?? globalThis.fetch,
    env: deps.env ?? process.env,
  });

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    try {
      if (await settings.handle(req, res)) {
        return;
      }

      if (method === "GET" && url === "/examples/world") {
        if (!deps.loadExampleProject) {
          sendJson(res, 503, { message: "Example loader not configured." });
          return;
        }
        const project = await deps.loadExampleProject();
        sendJson(res, 200, project);
        return;
      }

      if (method === "POST" && url === "/compose") {
        await handleCompose(req, res, {
          compile: deps.compile,
          homedir: deps.homedir,
          env: deps.env ?? process.env,
          invokeChat: deps.invokeChat,
          providerView: settings.providerView,
        });
        return;
      }

      if (method === "POST" && url === "/compile") {
        const { project, kinds } = parseProjectKinds(await readJson(req));
        const result = deps.compile(project, kinds);
        if (result.errors.length > 0) {
          sendJson(res, 400, { errors: result.errors });
          return;
        }
        sendJson(res, 200, { plan: result.plan });
        return;
      }

      if (method === "POST" && url === "/runs") {
        const body = await readJson<{
          project: MachinaProject;
          seed: number;
          stance?: Stance;
          possessNodeId?: string;
          kinds?: KindManifest[];
        }>(req);
        if (!deps.openEngineFromProject) {
          sendJson(res, 503, { message: "Runtime piece not ready." });
          return;
        }
        const engine = deps.openEngineFromProject(body.project, {
          think: deps.think,
          kinds: body.kinds,
          homedir: deps.homedir,
        });
        const compiled = engine.compile();
        if (!compiled.ok) {
          sendJson(res, 400, { errors: compiled.errors });
          return;
        }
        let engineRun: EngineRun;
        try {
          engineRun = await engine.start({
            seed: body.seed,
            stance: body.stance,
            possessNodeId: body.possessNodeId,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Request failed.";
          sendJson(res, 400, {
            message,
            errors: [{ code: "KIND_NO_RUNTIME", message }],
          });
          return;
        }
        engineRun.subscribe((msg) => {
          server.emit("instrument", toWs(msg));
        });
        runs.set(engineRun.id, { engineRun, paused: false });
        sendJson(res, 200, { id: engineRun.id });
        return;
      }

      const parsed = runPath(url);
      if (!parsed) {
        sendJson(res, 404, { message: "Not found." });
        return;
      }

      const run = runs.get(parsed.runId);
      if (!run) {
        sendJson(res, 404, { message: "Run not found." });
        return;
      }

      if (method === "GET" && parsed.action === "") {
        sendJson(res, 200, run.engineRun.getSummary());
        return;
      }

      if (method !== "POST") {
        sendJson(res, 405, { message: "Method not allowed." });
        return;
      }

      switch (parsed.action) {
        case "pause":
          run.engineRun.pause();
          run.paused = true;
          sendJson(res, 200, { ok: true });
          return;
        case "resume":
          run.engineRun.resume();
          run.paused = false;
          sendJson(res, 200, { ok: true });
          return;
        case "step": {
          const { turn } = await run.engineRun.step();
          sendJson(res, 200, { turn });
          server.emit("turn", { runId: run.engineRun.id, turn });
          return;
        }
        case "stance": {
          const body = await readJson<{ mode: Stance; nodeId?: string }>(req);
          run.engineRun.setStance(body.mode, body.nodeId);
          sendJson(res, 200, { ok: true });
          return;
        }
        case "interventions": {
          if (!run.paused) {
            sendJson(res, 409, {
              message: "Pause the world before changing it.",
            });
            return;
          }
          sendJson(res, 200, { ok: true });
          return;
        }
        case "possess/action": {
          const action = await readJson<AgentAction>(req);
          await run.engineRun.submitAction(action);
          sendJson(res, 200, { ok: true });
          return;
        }
        case "rewind": {
          const body = await readJson<{ turn: number }>(req);
          run.engineRun.rewind(body.turn);
          sendJson(res, 200, { ok: true });
          return;
        }
        default:
          sendJson(res, 404, { message: "Not found." });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      if (message === "The world is paused.") {
        sendJson(res, 409, { message });
        return;
      }
      sendJson(res, 500, { message: "Request failed." });
    }
  }) as RuntimeApp;

  server.runs = runs;
  attachWebSocket(server);
  return server;
}

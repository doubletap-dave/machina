import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AgentAction, MachinaProject, SimulationPlan } from "@machina/core";
import { attachWebSocket } from "./ws.ts";

type CompileResult =
  | { errors: Array<{ message: string }>; plan?: undefined }
  | { errors: []; plan: SimulationPlan };

type CompileFn = (project: MachinaProject) => CompileResult;

export type RuntimeDeps = {
  compile: CompileFn;
  createKernel?: (plan: SimulationPlan, seed: number) => unknown;
  saveProject?: (dir: string, project: MachinaProject) => Promise<void>;
  loadProject?: (dir: string) => Promise<MachinaProject>;
};

type Stance = "watch" | "god" | "possess";

type RunRecord = {
  id: string;
  turn: number;
  paused: boolean;
  stance: Stance;
  possessNodeId?: string;
  seed: number;
  errors: unknown[];
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

function runPath(url: string): { runId: string; action: string } | null {
  const match = url.match(/^\/runs\/([^/]+)(?:\/(.+))?$/);
  if (!match) {
    return null;
  }
  return { runId: match[1]!, action: match[2] ?? "" };
}

export function createApp(deps: RuntimeDeps): RuntimeApp {
  const runs = new Map<string, RunRecord>();

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    try {
      if (method === "POST" && url === "/compile") {
        const project = await readJson<MachinaProject>(req);
        const result = deps.compile(project);
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
        }>(req);
        const compileResult = deps.compile(body.project);
        if (compileResult.errors.length > 0) {
          sendJson(res, 400, { errors: compileResult.errors });
          return;
        }
        if (deps.createKernel && compileResult.plan) {
          deps.createKernel(compileResult.plan, body.seed);
        }
        const id = randomUUID();
        runs.set(id, {
          id,
          turn: 0,
          paused: false,
          stance: body.stance ?? "watch",
          possessNodeId: body.possessNodeId,
          seed: body.seed,
          errors: [],
        });
        sendJson(res, 200, { id });
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
        sendJson(res, 200, {
          id: run.id,
          turn: run.turn,
          cost: 0,
          errors: run.errors,
        });
        return;
      }

      if (method !== "POST") {
        sendJson(res, 405, { message: "Method not allowed." });
        return;
      }

      switch (parsed.action) {
        case "pause":
          run.paused = true;
          sendJson(res, 200, { ok: true });
          return;
        case "resume":
          run.paused = false;
          sendJson(res, 200, { ok: true });
          return;
        case "step": {
          run.turn += 1;
          sendJson(res, 200, { turn: run.turn });
          server.emit("turn", { runId: run.id, turn: run.turn });
          return;
        }
        case "stance": {
          const body = await readJson<{ mode: Stance; nodeId?: string }>(req);
          run.stance = body.mode;
          run.possessNodeId = body.nodeId;
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
          await readJson<AgentAction>(req);
          sendJson(res, 200, { ok: true });
          return;
        }
        case "rewind": {
          const body = await readJson<{ turn: number }>(req);
          run.turn = body.turn;
          sendJson(res, 200, { ok: true });
          return;
        }
        default:
          sendJson(res, 404, { message: "Not found." });
      }
    } catch {
      sendJson(res, 500, { message: "Request failed." });
    }
  }) as RuntimeApp;

  server.runs = runs;
  attachWebSocket(server);
  return server;
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentAction,
  GodView,
  InstrumentMsg,
  KindManifest,
  MachinaError,
  MachinaProject,
  ObservationPacket,
  SimulationPlan,
} from "@machina/core";
import { kindNoRuntimeCopy } from "@machina/core";
import { compile } from "@machina/graph";
import { createRegistry, kindManifestToDefinition } from "@machina/node-sdk";
import {
  loadKindManifests,
  loadProject,
  verifyProjectKinds,
  type ProjectMeta,
} from "@machina/persistence";
import { registerCoreKinds } from "@machina/plugin-core";
import { createKernelFromPlan, type ThinkFn } from "@machina/simulation";
import {
  loadCredentials,
  type CredentialsFile,
} from "./credentials.ts";
import {
  agentConfigsFromProject,
  createLlmThink,
  type InvokeChat,
} from "./llm-think.ts";

const NO_LLM =
  "No language model is configured. Possess the agent or set an API key.";

export type CompileOutcome =
  | { ok: true; plan: SimulationPlan }
  | { ok: false; errors: MachinaError[] };

export type EngineRun = {
  id: string;
  step(): Promise<{ turn: number }>;
  pause(): void;
  resume(): void;
  rewind(turn: number): void;
  setStance(mode: "watch" | "god" | "possess", nodeId?: string): void;
  submitAction(action: AgentAction): Promise<void>;
  applyIntervention(payload: { path: string; value: unknown; noticeable: boolean }): void;
  observation(actorId: string): ObservationPacket;
  viewAs(actorId: string): ObservationPacket;
  subscribe(listener: (msg: InstrumentMsg) => void): () => void;
  getSummary(): { id: string; turn: number; cost: number; errors: MachinaError[] };
  getGodView(): GodView | null;
};

export type MachinaEngine = {
  compile(): CompileOutcome;
  start(opts: {
    seed: number;
    stance?: "watch" | "god" | "possess";
    possessNodeId?: string;
  }): Promise<EngineRun>;
};

export type OpenEngineOpts = {
  think?: ThinkFn;
  credentials?: CredentialsFile;
  invokeChat?: InvokeChat;
  homedir?: string;
  kinds?: KindManifest[];
};

type Stance = { mode: "watch" | "god" | "possess"; nodeId?: string };

function registryWithKinds(kinds: KindManifest[] = []) {
  const registry = createRegistry();
  registerCoreKinds(registry);
  for (const kind of kinds) {
    registry.register(kindManifestToDefinition(kind));
  }
  return registry;
}

function compileProject(
  project: MachinaProject,
  kinds: KindManifest[] = [],
  kindErrors: MachinaError[] = [],
): CompileOutcome {
  const result = compile(project, registryWithKinds(kinds));
  const errors = [
    ...kindErrors,
    ...("errors" in result ? result.errors : []),
  ];
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, plan: result.plan };
}

function refuseMissingRuntime(
  project: MachinaProject,
  kinds: KindManifest[],
): void {
  const registry = registryWithKinds(kinds);
  const missing = new Map<string, { name: string; id: string }>();
  for (const graph of project.graphs) {
    for (const node of graph.nodes) {
      const def = registry.get(node.kind, node.version);
      if (def && def.runtime === undefined) {
        missing.set(def.type, { name: def.metadata.name, id: def.type });
      }
    }
  }
  const ordered = [...missing.values()].sort((a, b) => a.id.localeCompare(b.id));
  if (ordered.length > 0) {
    throw new Error(
      ordered.map((kind) => kindNoRuntimeCopy(kind.name, kind.id)).join(" "),
    );
  }
}

async function loadKindPins(
  dir: string,
): Promise<NonNullable<ProjectMeta["kindPins"]>> {
  const raw = await readFile(join(dir, "machina.json"), "utf-8");
  const meta = JSON.parse(raw) as ProjectMeta;
  return meta.kindPins ?? [];
}

function createRun(
  plan: SimulationPlan,
  startOpts: {
    seed: number;
    stance?: "watch" | "god" | "possess";
    possessNodeId?: string;
  },
  think?: ThinkFn,
): EngineRun {
  const listeners = new Set<(msg: InstrumentMsg) => void>();
  const emit = (msg: InstrumentMsg) => {
    for (const listener of listeners) listener(msg);
  };

  const stance: Stance = {
    mode: startOpts.stance ?? "watch",
    nodeId: startOpts.possessNodeId,
  };
  const pendingPossess: Array<(action: AgentAction) => void> = [];
  const errors: MachinaError[] = [];
  const cost = 0;
  const id = crypto.randomUUID();
  let pendingIntervention = false;

  const kernel = createKernelFromPlan(plan, {
    seed: startOpts.seed,
    onInstrument: emit,
    think: async (input) => {
      const actorKey = input.packet.actorId;
      if (stance.mode === "possess" && stance.nodeId === actorKey) {
        return await new Promise<AgentAction>((resolve) => {
          pendingPossess.push(resolve);
          emit({ type: "possess-wait", nodeId: actorKey, packet: input.packet });
        });
      }
      try {
        if (!think) {
          throw new Error(NO_LLM);
        }
        return await think(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({ type: "error", message });
        if (message === NO_LLM) {
          errors.push({ code: "NO_LLM", message: NO_LLM });
        }
        throw error instanceof Error ? error : new Error(message);
      }
    },
  });

  return {
    id,
    async step() {
      if (kernel.paused && !pendingIntervention) {
        throw new Error("The world is paused.");
      }
      try {
        await kernel.runTurn();
        return { turn: kernel.getTruth().turn };
      } catch (error) {
        kernel.paused = true;
        throw error;
      } finally {
        pendingIntervention = false;
      }
    },
    pause() {
      kernel.paused = true;
    },
    resume() {
      kernel.paused = false;
    },
    rewind(turn) {
      kernel.rewind(turn);
    },
    setStance(mode, nodeId) {
      stance.mode = mode;
      stance.nodeId = nodeId;
    },
    async submitAction(action) {
      const resolve = pendingPossess.shift();
      if (!resolve) {
        throw new Error("No agent is waiting for a possess action.");
      }
      resolve(action);
    },
    applyIntervention(payload) {
      kernel.applyIntervention(payload);
      pendingIntervention = true;
    },
    observation(actorId) {
      return kernel.peekPacket(actorId);
    },
    viewAs(actorId) {
      return kernel.peekPacket(actorId);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSummary() {
      return { id, turn: kernel.getTruth().turn, cost, errors: [...errors] };
    },
    getGodView() {
      if (stance.mode !== "god") {
        return null;
      }
      const truth = kernel.getTruth();
      return { turn: truth.turn, actors: truth.actors };
    },
  };
}

function createEngine(
  project: MachinaProject,
  opts?: OpenEngineOpts,
  kindErrors: MachinaError[] = [],
): MachinaEngine {
  const kinds = opts?.kinds ?? [];
  return {
    compile() {
      return compileProject(project, kinds, kindErrors);
    },
    async start(startOpts) {
      const compiled = compileProject(project, kinds, kindErrors);
      if (!compiled.ok) {
        throw new Error(compiled.errors.map((error) => error.message).join(" "));
      }
      refuseMissingRuntime(project, kinds);
      const think = opts?.think ?? createLlmThink({
        invokeChat: opts?.invokeChat,
        credentials:
          opts?.credentials ??
          (await loadCredentials({ homedir: opts?.homedir })).file,
        agentConfig: agentConfigsFromProject(project),
      });
      return createRun(compiled.plan, startOpts, think);
    },
  };
}

export function openEngineFromProject(
  project: MachinaProject,
  opts?: OpenEngineOpts,
): MachinaEngine {
  return createEngine(project, opts);
}

export async function openEngine(
  dir: string,
  opts?: OpenEngineOpts,
): Promise<MachinaEngine> {
  const project = await loadProject(dir);
  const kinds = await loadKindManifests(dir);
  const kindErrors = await verifyProjectKinds(dir, await loadKindPins(dir));
  return createEngine(project, { ...opts, kinds }, kindErrors);
}

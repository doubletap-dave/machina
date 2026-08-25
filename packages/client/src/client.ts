import type {
  AgentAction,
  InstrumentMsg,
  MachinaError,
  MachinaProject,
  SimulationPlan,
} from "@machina/core";

export type CompileOutcome =
  | { ok: true; plan: SimulationPlan }
  | { ok: false; errors: MachinaError[] };

function defaultWsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return `${trimmed.replace(/^http/, "ws")}/ws`;
}

function failMessage(body: { message?: unknown }): string {
  return typeof body.message === "string" ? body.message : "Request failed.";
}

export class MachinaClient {
  #baseUrl: string;
  #wsUrl: string;

  constructor(opts: { baseUrl: string; wsUrl?: string }) {
    this.#baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.#wsUrl = opts.wsUrl ?? defaultWsUrl(this.#baseUrl);
  }

  async compile(project: MachinaProject): Promise<CompileOutcome> {
    const response = await fetch(`${this.#baseUrl}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(project),
    });
    const body = (await response.json()) as {
      plan?: SimulationPlan;
      errors?: MachinaError[];
    };
    if (!response.ok) {
      return { ok: false, errors: body.errors ?? [] };
    }
    return { ok: true, plan: body.plan as SimulationPlan };
  }

  async startRun(body: {
    project: MachinaProject;
    seed: number;
    stance?: string;
    possessNodeId?: string;
  }): Promise<{ id: string }> {
    return this.#postJson("/runs", body);
  }

  async step(runId: string): Promise<{ turn: number }> {
    return this.#postJson(`/runs/${runId}/step`);
  }

  async pause(runId: string): Promise<void> {
    await this.#postJson(`/runs/${runId}/pause`);
  }

  async resume(runId: string): Promise<void> {
    await this.#postJson(`/runs/${runId}/resume`);
  }

  async rewind(runId: string, turn: number): Promise<void> {
    await this.#postJson(`/runs/${runId}/rewind`, { turn });
  }

  async setStance(
    runId: string,
    mode: "watch" | "god" | "possess",
    nodeId?: string,
  ): Promise<void> {
    await this.#postJson(`/runs/${runId}/stance`, { mode, nodeId });
  }

  async submitAction(runId: string, action: AgentAction): Promise<void> {
    await this.#postJson(`/runs/${runId}/possess/action`, action);
  }

  async getRun(
    runId: string,
  ): Promise<{ id: string; turn: number; cost: number; errors: unknown[] }> {
    const response = await fetch(`${this.#baseUrl}/runs/${runId}`);
    return this.#readOk(response);
  }

  async loadExampleWorld(): Promise<MachinaProject> {
    const response = await fetch(`${this.#baseUrl}/examples/world`);
    return this.#readOk(response);
  }

  subscribe(onMessage: (msg: InstrumentMsg) => void): () => void {
    const ws = new WebSocket(this.#wsUrl);
    const onData = (event: MessageEvent) => {
      const raw = typeof event.data === "string" ? event.data : "";
      try {
        const msg = JSON.parse(raw) as InstrumentMsg | { type: string };
        if (msg.type === "event") {
          return;
        }
        onMessage(msg as InstrumentMsg);
      } catch {
        return;
      }
    };
    ws.addEventListener("message", onData);
    return () => {
      ws.removeEventListener("message", onData);
      ws.close();
    };
  }

  async #postJson<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.#readOk(response);
  }

  async #readOk<T>(response: Response): Promise<T> {
    const body = (await response.json()) as { message?: unknown };
    if (!response.ok) {
      throw new Error(failMessage(body));
    }
    return body as T;
  }
}

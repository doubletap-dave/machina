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

export type ProviderId = "anthropic" | "openai" | "openrouter" | "perplexity";

export type CachedModel = { id: string; name: string };

export type PublicProviderSlice = {
  configured: boolean;
  verified: boolean;
  last4: string;
  models: CachedModel[];
  message?: string;
};

export type SettingsModels = {
  default: { provider: ProviderId; model: string } | null;
  providers: Record<string, PublicProviderSlice>;
  message?: string;
};

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

  async getSettings(): Promise<SettingsModels> {
    const response = await fetch(`${this.#baseUrl}/settings/models`);
    return this.#readOk(response);
  }

  async putProviderKey(
    id: ProviderId,
    apiKey: string,
  ): Promise<PublicProviderSlice> {
    return this.#sendJson("PUT", `/settings/providers/${id}`, { apiKey });
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    await this.#sendJson("DELETE", `/settings/providers/${id}`);
  }

  async refreshProvider(id: ProviderId): Promise<PublicProviderSlice> {
    return this.#sendJson("POST", `/settings/providers/${id}/refresh`);
  }

  async putDefault(body: {
    provider: ProviderId;
    model: string;
  }): Promise<{ default: { provider: ProviderId; model: string } }> {
    return this.#sendJson("PUT", "/settings/default", body);
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
    return this.#sendJson("POST", path, body);
  }

  async #sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.#readOk(response);
  }

  async #readOk<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as { message?: unknown }) : {};
    if (!response.ok) {
      throw new Error(failMessage(parsed));
    }
    return parsed as T;
  }
}

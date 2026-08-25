import {
  agentLlmIncompleteCopy,
  illegalModelActionCopy,
  type AgentAction,
  type MachinaProject,
} from "@machina/core";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { ThinkFn } from "@machina/simulation";
import {
  apiKeyFromEnv,
  isProviderId,
  type CredentialsFile,
  type ProviderId,
} from "./credentials.ts";

const NO_LLM =
  "No language model is configured. Possess the agent or set an API key.";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const PERPLEXITY_BASE = "https://api.perplexity.ai";

export type AgentLlmOverride = {
  llmProvider?: ProviderId;
  llmModel?: string;
  model?: string;
};

export type InvokeChat = (args: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  prompt: string;
}) => Promise<string>;

export type CreateLlmThinkOpts = {
  invokeChat?: InvokeChat;
  credentials: CredentialsFile;
  agentConfig: Record<string, AgentLlmOverride>;
  env?: NodeJS.Dict<string>;
};

export function agentConfigsFromProject(
  project: MachinaProject,
): Record<string, AgentLlmOverride> {
  const out: Record<string, AgentLlmOverride> = {};
  for (const graph of project.graphs) {
    for (const node of graph.nodes) {
      if (node.kind !== "cognition.agent") continue;
      const override = overrideFromConfig(node.config);
      out[node.id] = override;
      if (graph.parentNodeId) {
        out[graph.parentNodeId] = override;
      }
    }
  }
  return out;
}

export function createLlmThink(opts: CreateLlmThinkOpts): ThinkFn {
  const invoke = opts.invokeChat ?? langchainInvokeChat;
  const env = opts.env ?? process.env;
  return async (input) => {
    const resolved = resolveModel(
      opts.agentConfig[input.nodeId] ?? {},
      opts.credentials,
    );
    if (!resolved.ok) {
      throw new Error(resolved.message);
    }
    const apiKey =
      nonempty(opts.credentials.providers[resolved.provider]?.apiKey) ??
      apiKeyFromEnv(resolved.provider, env);
    if (!apiKey) {
      throw new Error(NO_LLM);
    }
    const prompt = [
      JSON.stringify(input.packet),
      `Reply with JSON only {"type": string, "params": object} where type is one of: ${input.packet.legalActions.join(", ")}.`,
    ].join("\n");
    const raw = await invoke({
      provider: resolved.provider,
      model: resolved.model,
      apiKey,
      prompt,
    });
    const { type, params } = parseAction(raw);
    if (!input.packet.legalActions.includes(type)) {
      throw new Error(illegalModelActionCopy());
    }
    const action: AgentAction = {
      actorId: input.packet.actorId,
      type,
      params,
    };
    return action;
  };
}

export async function langchainInvokeChat(args: {
  provider: ProviderId;
  model: string;
  apiKey: string;
  prompt: string;
}): Promise<string> {
  const chat =
    args.provider === "anthropic"
      ? new ChatAnthropic({ model: args.model, apiKey: args.apiKey })
      : new ChatOpenAI({
          model: args.model,
          apiKey: args.apiKey,
          configuration: openaiCompatibleBase(args.provider)
            ? { baseURL: openaiCompatibleBase(args.provider) }
            : undefined,
        });
  const result = await chat.invoke(args.prompt);
  return contentToText(result.content);
}

function overrideFromConfig(config: unknown): AgentLlmOverride {
  if (!config || typeof config !== "object") {
    return {};
  }
  const raw = config as Record<string, unknown>;
  const override: AgentLlmOverride = {};
  if (typeof raw.llmProvider === "string" && isProviderId(raw.llmProvider)) {
    override.llmProvider = raw.llmProvider;
  }
  if (typeof raw.llmModel === "string" && raw.llmModel.length > 0) {
    override.llmModel = raw.llmModel;
  }
  if (typeof raw.model === "string") {
    override.model = raw.model;
  }
  return override;
}

function resolveModel(
  override: AgentLlmOverride,
  credentials: CredentialsFile,
):
  | { ok: true; provider: ProviderId; model: string }
  | { ok: false; message: string } {
  const providerSet = override.llmProvider !== undefined;
  const modelSet = nonempty(override.llmModel) !== undefined;
  if (providerSet !== modelSet) {
    return { ok: false, message: agentLlmIncompleteCopy() };
  }
  if (providerSet && modelSet) {
    return {
      ok: true,
      provider: override.llmProvider!,
      model: override.llmModel!,
    };
  }
  if (credentials.default) {
    return {
      ok: true,
      provider: credentials.default.provider,
      model: credentials.default.model,
    };
  }
  return { ok: false, message: NO_LLM };
}

function parseAction(text: string): {
  type: string;
  params: Record<string, unknown>;
} {
  const candidate = stripFences(text.trim());
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error(illegalModelActionCopy());
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(illegalModelActionCopy());
  }
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.type !== "string") {
    throw new Error(illegalModelActionCopy());
  }
  if (rec.params === undefined) {
    return { type: rec.type, params: {} };
  }
  if (
    !rec.params ||
    typeof rec.params !== "object" ||
    Array.isArray(rec.params)
  ) {
    throw new Error(illegalModelActionCopy());
  }
  return { type: rec.type, params: rec.params as Record<string, unknown> };
}

function stripFences(text: string): string {
  if (!text.startsWith("```")) {
    return text;
  }
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
}

function openaiCompatibleBase(provider: ProviderId): string | undefined {
  if (provider === "openrouter") return OPENROUTER_BASE;
  if (provider === "perplexity") return PERPLEXITY_BASE;
  return undefined;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        return String((part as { text: unknown }).text);
      }
      return "";
    })
    .join("");
}

function nonempty(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

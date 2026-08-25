import { describe, expect, it, vi } from "vitest";
import {
  agentLlmIncompleteCopy,
  illegalModelActionCopy,
  type ObservationPacket,
} from "@machina/core";
import type { CredentialsFile } from "../src/credentials.ts";
import { createLlmThink } from "../src/llm-think.ts";

const NO_LLM =
  "No language model is configured. Possess the agent or set an API key.";

function packet(over: Partial<ObservationPacket> = {}): ObservationPacket {
  return {
    actorId: "atlantic-federation",
    turn: 1,
    observations: [],
    memory: null,
    goals: null,
    personality: null,
    legalActions: ["wait", "signal"],
    ...over,
  };
}

function creds(over: Partial<CredentialsFile> = {}): CredentialsFile {
  return {
    schemaVersion: 1,
    default: { provider: "openai", model: "gpt-4o" },
    providers: {
      openai: {
        apiKey: "sk-test",
        last4: "test",
        verifiedAt: "2026-08-24T00:00:00.000Z",
        models: [{ id: "gpt-4o", name: "gpt-4o" }],
      },
    },
    ...over,
  };
}

describe("createLlmThink", () => {
  it("returns a legal wait action from stub JSON", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "wait", params: {} }),
    );
    const think = createLlmThink({
      invokeChat,
      credentials: creds(),
      agentConfig: {},
    });
    const action = await think({
      nodeId: "atlantic-federation",
      packet: packet(),
    });
    expect(action).toEqual({
      actorId: "atlantic-federation",
      type: "wait",
      params: {},
    });
    expect(invokeChat).toHaveBeenCalledTimes(1);
    const prompt = invokeChat.mock.calls[0]![0].prompt;
    expect(prompt).toContain('"actorId":"atlantic-federation"');
    expect(prompt).toContain("wait");
  });

  it("throws illegalModelActionCopy on bad JSON", async () => {
    const think = createLlmThink({
      invokeChat: async () => "not json",
      credentials: creds(),
      agentConfig: {},
    });
    await expect(
      think({ nodeId: "n", packet: packet() }),
    ).rejects.toThrow(illegalModelActionCopy());
  });

  it("throws illegalModelActionCopy when type is not legal", async () => {
    const think = createLlmThink({
      invokeChat: async () =>
        JSON.stringify({ type: "invade", params: {} }),
      credentials: creds(),
      agentConfig: {},
    });
    await expect(
      think({ nodeId: "n", packet: packet() }),
    ).rejects.toThrow(illegalModelActionCopy());
  });

  it("throws agentLlmIncompleteCopy when only provider is set", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "wait", params: {} }),
    );
    const think = createLlmThink({
      invokeChat,
      credentials: creds(),
      agentConfig: {
        leader: { llmProvider: "anthropic" },
      },
    });
    await expect(
      think({ nodeId: "leader", packet: packet() }),
    ).rejects.toThrow(agentLlmIncompleteCopy());
    expect(invokeChat).not.toHaveBeenCalled();
  });

  it("throws agentLlmIncompleteCopy when only model is set", async () => {
    const think = createLlmThink({
      invokeChat: async () => JSON.stringify({ type: "wait", params: {} }),
      credentials: creds(),
      agentConfig: {
        leader: { llmModel: "claude-sonnet-4-5" },
      },
    });
    await expect(
      think({ nodeId: "leader", packet: packet() }),
    ).rejects.toThrow(agentLlmIncompleteCopy());
  });

  it("throws existing NO_LLM when default is missing", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "wait", params: {} }),
    );
    const think = createLlmThink({
      invokeChat,
      credentials: creds({ default: null, providers: {} }),
      agentConfig: {},
    });
    await expect(
      think({ nodeId: "n", packet: packet() }),
    ).rejects.toThrow(NO_LLM);
    expect(invokeChat).not.toHaveBeenCalled();
  });

  it("treats config.model mock as unset and uses the default", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "signal", params: { n: 1 } }),
    );
    const think = createLlmThink({
      invokeChat,
      credentials: creds(),
      agentConfig: {
        "atlantic-federation": { model: "mock" },
      },
    });
    const action = await think({
      nodeId: "atlantic-federation",
      packet: packet(),
    });
    expect(action.type).toBe("signal");
    expect(invokeChat.mock.calls[0]![0].model).toBe("gpt-4o");
    expect(invokeChat.mock.calls[0]![0].provider).toBe("openai");
  });

  it("uses a complete agent override instead of the default", async () => {
    const invokeChat = vi.fn(async () =>
      JSON.stringify({ type: "wait", params: {} }),
    );
    const think = createLlmThink({
      invokeChat,
      credentials: creds({
        providers: {
          openai: {
            apiKey: "sk-test",
            last4: "test",
            verifiedAt: "2026-08-24T00:00:00.000Z",
            models: [],
          },
          anthropic: {
            apiKey: "sk-ant",
            last4: "kant",
            verifiedAt: "2026-08-24T00:00:00.000Z",
            models: [],
          },
        },
      }),
      agentConfig: {
        leader: { llmProvider: "anthropic", llmModel: "claude-sonnet-4-5" },
      },
    });
    await think({ nodeId: "leader", packet: packet() });
    expect(invokeChat.mock.calls[0]![0].provider).toBe("anthropic");
    expect(invokeChat.mock.calls[0]![0].model).toBe("claude-sonnet-4-5");
    expect(invokeChat.mock.calls[0]![0].apiKey).toBe("sk-ant");
  });
});

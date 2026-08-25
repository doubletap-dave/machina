import { describe, expect, it } from "vitest";
import { keyRefusedCopy, providerUnreachableCopy } from "@machina/core";
import { listAndVerify } from "../src/list-models.ts";

type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(
  status: number,
  body: unknown,
  calls: FetchCall[] = [],
): typeof fetch {
  return (async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const recorded: Record<string, string> = {};
    headers.forEach((value, key) => {
      recorded[key] = value;
    });
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: recorded,
    });
    return jsonResponse(status, body);
  }) as typeof fetch;
}

function rejectingFetch(error: Error): typeof fetch {
  return (async () => {
    throw error;
  }) as typeof fetch;
}

describe("listAndVerify", () => {
  it("returns keyRefusedCopy on 401", async () => {
    const result = await listAndVerify(
      "openai",
      "sk-bad",
      stubFetch(401, { error: "unauthorized" }),
    );
    expect(result).toEqual({ ok: false, message: keyRefusedCopy() });
  });

  it("returns keyRefusedCopy on 403", async () => {
    const result = await listAndVerify(
      "openai",
      "sk-bad",
      stubFetch(403, { error: "forbidden" }),
    );
    expect(result).toEqual({ ok: false, message: keyRefusedCopy() });
  });

  it("parses Anthropic-shaped 200 using display_name", async () => {
    const result = await listAndVerify(
      "anthropic",
      "sk-ant-ok",
      stubFetch(200, {
        data: [
          { id: "claude-sonnet-4-5", display_name: "Claude Sonnet" },
          { id: "claude-opus-4" },
        ],
      }),
    );
    expect(result).toEqual({
      ok: true,
      models: [
        { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
        { id: "claude-opus-4", name: "claude-opus-4" },
      ],
    });
  });

  it("parses OpenAI-shaped 200 using id as name", async () => {
    const result = await listAndVerify(
      "openai",
      "sk-ok",
      stubFetch(200, { data: [{ id: "gpt-4o" }, { id: "gpt-4.1" }] }),
    );
    expect(result).toEqual({
      ok: true,
      models: [
        { id: "gpt-4o", name: "gpt-4o" },
        { id: "gpt-4.1", name: "gpt-4.1" },
      ],
    });
  });

  it("returns providerUnreachableCopy on network error", async () => {
    const result = await listAndVerify(
      "openrouter",
      "sk-or",
      rejectingFetch(new Error("ECONNREFUSED")),
    );
    expect(result).toEqual({
      ok: false,
      message: providerUnreachableCopy("openrouter"),
    });
  });

  it("returns providerUnreachableCopy on other HTTP status", async () => {
    const result = await listAndVerify(
      "perplexity",
      "pplx-key",
      stubFetch(500, { error: "internal" }),
    );
    expect(result).toEqual({
      ok: false,
      message: providerUnreachableCopy("perplexity"),
    });
  });

  it("GETs Anthropic models with x-api-key and anthropic-version", async () => {
    const calls: FetchCall[] = [];
    await listAndVerify(
      "anthropic",
      "sk-ant-key",
      stubFetch(200, { data: [] }, calls),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.anthropic.com/v1/models");
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.headers["x-api-key"]).toBe("sk-ant-key");
    expect(calls[0]!.headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("GETs OpenAI models with Bearer auth", async () => {
    const calls: FetchCall[] = [];
    await listAndVerify("openai", "sk-oai", stubFetch(200, { data: [] }, calls));
    expect(calls[0]!.url).toBe("https://api.openai.com/v1/models");
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.headers.authorization).toBe("Bearer sk-oai");
  });

  it("GETs OpenRouter models with Bearer auth", async () => {
    const calls: FetchCall[] = [];
    await listAndVerify(
      "openrouter",
      "sk-or",
      stubFetch(200, { data: [] }, calls),
    );
    expect(calls[0]!.url).toBe("https://openrouter.ai/api/v1/models");
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.headers.authorization).toBe("Bearer sk-or");
  });

  it("GETs Perplexity models with Bearer auth", async () => {
    const calls: FetchCall[] = [];
    await listAndVerify(
      "perplexity",
      "pplx",
      stubFetch(200, { data: [] }, calls),
    );
    expect(calls[0]!.url).toBe("https://api.perplexity.ai/v1/models");
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.headers.authorization).toBe("Bearer pplx");
  });
});

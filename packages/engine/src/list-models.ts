import { keyRefusedCopy, providerUnreachableCopy } from "@machina/core";
import type { CachedModel, ProviderId } from "./credentials.ts";

export type ListModelsResult =
  | { ok: true; models: CachedModel[] }
  | { ok: false; message: string };

const LIST_URL: Record<ProviderId, string> = {
  anthropic: "https://api.anthropic.com/v1/models",
  openai: "https://api.openai.com/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  perplexity: "https://api.perplexity.ai/v1/models",
};

function headersFor(provider: ProviderId, apiKey: string): Record<string, string> {
  if (provider === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

export async function listAndVerify(
  provider: ProviderId,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<ListModelsResult> {
  let response: Response;
  try {
    response = await fetchImpl(LIST_URL[provider], {
      method: "GET",
      headers: headersFor(provider, apiKey),
    });
  } catch {
    return { ok: false, message: providerUnreachableCopy(provider) };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: keyRefusedCopy() };
  }
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, message: providerUnreachableCopy(provider) };
  }

  try {
    const body: unknown = await response.json();
    return { ok: true, models: parseModels(body) };
  } catch {
    return { ok: false, message: providerUnreachableCopy(provider) };
  }
}

function parseModels(body: unknown): CachedModel[] {
  if (!body || typeof body !== "object" || !("data" in body)) {
    return [];
  }
  const data = (body as { data: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }
  const models: CachedModel[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object" || !("id" in entry)) {
      continue;
    }
    const id = (entry as { id: unknown }).id;
    if (typeof id !== "string") {
      continue;
    }
    const displayName = (entry as { display_name?: unknown }).display_name;
    models.push({
      id,
      name: typeof displayName === "string" ? displayName : id,
    });
  }
  return models;
}

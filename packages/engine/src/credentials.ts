import { execFileSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir as osHomedir } from "node:os";
import { dirname, join } from "node:path";
import { credentialsUnreadableCopy } from "@machina/core";

export type ProviderId = "anthropic" | "openai" | "openrouter" | "perplexity";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "anthropic",
  "openai",
  "openrouter",
  "perplexity",
];

export const PROVIDER_ENV: Record<ProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

export function isProviderId(id: string): id is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(id);
}

export function apiKeyFromEnv(
  id: ProviderId,
  env: NodeJS.Dict<string> = process.env,
): string | undefined {
  const raw = env[PROVIDER_ENV[id]];
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type CachedModel = { id: string; name: string };

export type ProviderRecord = {
  apiKey: string;
  last4: string;
  verifiedAt: string | null;
  models: CachedModel[];
};

export type CredentialsFile = {
  schemaVersion: 1;
  default: { provider: ProviderId; model: string } | null;
  providers: Partial<Record<ProviderId, ProviderRecord>>;
};

export type CredentialsOpts = {
  homedir?: string;
};

export type LoadCredentialsResult = {
  file: CredentialsFile;
  unreadable: boolean;
  message?: string;
};

export type PublicProviderView = {
  configured: boolean;
  verified: boolean;
  last4: string;
  models: CachedModel[];
};

export function credentialsPath(opts?: CredentialsOpts): string {
  return join(opts?.homedir ?? osHomedir(), ".machina", "credentials.json");
}

export function last4(apiKey: string): string {
  return apiKey.length <= 4 ? apiKey : apiKey.slice(-4);
}

export function emptyCredentials(): CredentialsFile {
  return { schemaVersion: 1, default: null, providers: {} };
}

export function publicProviderView(
  record: ProviderRecord | undefined,
): PublicProviderView {
  if (!record) {
    return { configured: false, verified: false, last4: "", models: [] };
  }
  return {
    configured: record.apiKey.length > 0,
    verified: record.verifiedAt !== null,
    last4: record.last4,
    models: record.models,
  };
}

export function restrictToOwner(filePath: string): void {
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // best-effort
  }
  if (process.platform !== "win32") {
    return;
  }
  const user = process.env.USERNAME;
  if (!user) {
    return;
  }
  try {
    execFileSync(
      "icacls",
      [filePath, "/inheritance:r", "/grant:r", `${user}:F`],
      { stdio: "ignore", timeout: 5000 },
    );
  } catch {
    // Windows ACL is best-effort
  }
}

// Env overlay (ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY,
// PERPLEXITY_API_KEY) is applied by list-models / settings HTTP (Tasks 2–3).
// load/save here is the file only. Never persist env keys to disk.

export async function saveCredentials(
  file: CredentialsFile,
  opts?: CredentialsOpts,
): Promise<void> {
  const path = credentialsPath(opts);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(file, null, 2), "utf8");
  restrictToOwner(path);
}

export async function loadCredentials(
  opts?: CredentialsOpts,
): Promise<LoadCredentialsResult> {
  const path = credentialsPath(opts);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { file: emptyCredentials(), unreadable: false };
    }
    return unreadable();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCredentialsFile(parsed)) {
      return unreadable();
    }
    return { file: parsed, unreadable: false };
  } catch {
    return unreadable();
  }
}

function unreadable(): LoadCredentialsResult {
  return {
    file: emptyCredentials(),
    unreadable: true,
    message: credentialsUnreadableCopy(),
  };
}

function isCredentialsFile(value: unknown): value is CredentialsFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return obj.schemaVersion === 1 && typeof obj.providers === "object" && obj.providers !== null;
}

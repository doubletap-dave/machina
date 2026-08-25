import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { credentialsUnreadableCopy } from "@machina/core";
import {
  last4,
  loadCredentials,
  publicProviderView,
  saveCredentials,
  type CredentialsFile,
  type ProviderRecord,
} from "../src/credentials.ts";

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "machina-creds-"));
}

const sampleKey = "sk-ant-1234abcd";

function sampleFile(): CredentialsFile {
  const record: ProviderRecord = {
    apiKey: sampleKey,
    last4: last4(sampleKey),
    verifiedAt: null,
    models: [{ id: "claude-sonnet-4-5", name: "Claude Sonnet" }],
  };
  return {
    schemaVersion: 1,
    default: { provider: "anthropic", model: "claude-sonnet-4-5" },
    providers: { anthropic: record },
  };
}

describe("credentials", () => {
  it("last4 of sk-ant-1234abcd is abcd", () => {
    expect(last4("sk-ant-1234abcd")).toBe("abcd");
  });

  it("saves and loads a round-trip", async () => {
    const homedir = await tempHome();
    const file = sampleFile();
    await saveCredentials(file, { homedir });
    const loaded = await loadCredentials({ homedir });
    expect(loaded.file).toEqual(file);
    expect(loaded.unreadable).toBe(false);
  });

  it("public view has no apiKey", () => {
    const record = sampleFile().providers.anthropic!;
    const view = publicProviderView(record);
    expect(view).not.toHaveProperty("apiKey");
    expect(JSON.stringify(view)).not.toContain("apiKey");
    expect(JSON.stringify(view)).not.toContain(sampleKey);
    expect(view.last4).toBe("abcd");
    expect(view.configured).toBe(true);
    expect(view.verified).toBe(false);
    expect(view.models).toEqual([
      { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
    ]);
  });

  it("corrupt JSON returns credentialsUnreadableCopy", async () => {
    const homedir = await tempHome();
    const dir = join(homedir, ".machina");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "credentials.json"), "{ not json", "utf8");
    const loaded = await loadCredentials({ homedir });
    expect(loaded.unreadable).toBe(true);
    expect(loaded.message).toBe(credentialsUnreadableCopy());
    expect(loaded.file).toEqual({
      schemaVersion: 1,
      default: null,
      providers: {},
    });
  });
});

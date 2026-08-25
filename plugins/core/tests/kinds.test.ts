import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "../src/index.ts";
import { agentConfigSchema } from "../src/kinds/schemas.ts";

describe("agentConfigSchema", () => {
  it("parse({}) has no model mock", () => {
    const parsed = agentConfigSchema.parse({});
    expect(parsed).not.toHaveProperty("model");
    expect((parsed as { model?: string }).model).not.toBe("mock");
  });
});

describe("registerCoreKinds", () => {
  it("registers all 14 V0 core node kinds", () => {
    const registry = createRegistry();
    registerCoreKinds(registry);
    expect(registry.list()).toHaveLength(14);
  });

  it("exposes operator-facing names", () => {
    const registry = createRegistry();
    registerCoreKinds(registry);
    expect(registry.get("cognition.agent", 1)?.metadata.name).toBe("Agent");
    expect(registry.get("entities.world")?.metadata.name).toBe("World");
  });
});

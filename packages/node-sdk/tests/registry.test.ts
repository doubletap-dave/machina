import { describe, expect, it } from "vitest";
import { createRegistry, defineNode } from "../src/index.ts";

describe("NodeRegistry", () => {
  it("registers and retrieves nodes by type and version", () => {
    const registry = createRegistry();
    const def = defineNode({
      type: "cognition.personality",
      version: 1,
      metadata: { name: "Personality", category: "Cognition" },
      ports: {},
      configSchema: {} as never,
    });
    registry.register(def);
    expect(registry.get("cognition.personality", 1)).toBe(def);
  });

  it("get without version returns highest registered version", () => {
    const registry = createRegistry();
    const v1 = defineNode({
      type: "entities.world",
      version: 1,
      metadata: { name: "World v1", category: "Entities" },
      ports: {},
      configSchema: {} as never,
    });
    const v2 = defineNode({
      type: "entities.world",
      version: 2,
      metadata: { name: "World v2", category: "Entities" },
      ports: {},
      configSchema: {} as never,
    });
    registry.register(v1);
    registry.register(v2);
    expect(registry.get("entities.world")?.metadata.name).toBe("World v2");
  });

  it("getOrThrow throws for unknown type", () => {
    const registry = createRegistry();
    expect(() => registry.getOrThrow("nope", 1)).toThrow(
      "Machina doesn't know a node called nope.",
    );
  });

  it("getOrThrow throws for version mismatch", () => {
    const registry = createRegistry();
    const def = defineNode({
      type: "cognition.personality",
      version: 1,
      metadata: { name: "Personality", category: "Cognition" },
      ports: {},
      configSchema: {} as never,
    });
    registry.register(def);
    expect(() => registry.getOrThrow("cognition.personality", 2)).toThrow(
      "This node needs an update.",
    );
  });
});

import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaNode } from "@machina/core";
import { isValidMachinaConnection } from "./is-valid-connection.ts";

function testRegistry() {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

function node(id: string, kind: string): MachinaNode {
  return {
    id,
    kind,
    version: 1,
    position: { x: 0, y: 0 },
    config: {},
  };
}

describe("isValidMachinaConnection", () => {
  it("rejects RESOURCE out into PERSONALITY in", () => {
    const registry = testRegistry();
    const nodes = [node("resource", "entities.resource"), node("agent", "cognition.agent")];

    expect(
      isValidMachinaConnection({
        registry,
        nodes,
        source: "resource",
        target: "agent",
        sourceHandle: "stock",
        targetHandle: "personality",
      }),
    ).toBe(false);
  });

  it("accepts CLOCK out into world CLOCK in", () => {
    const registry = testRegistry();
    const nodes = [node("clock", "control.clock"), node("world", "entities.world")];

    expect(
      isValidMachinaConnection({
        registry,
        nodes,
        source: "clock",
        target: "world",
        sourceHandle: "tick",
        targetHandle: "tick",
      }),
    ).toBe(true);
  });

  it("rejects null source, target, or handles", () => {
    const registry = testRegistry();
    const nodes = [node("clock", "control.clock"), node("world", "entities.world")];
    const base = {
      registry,
      nodes,
      source: "clock" as string | null,
      target: "world" as string | null,
      sourceHandle: "tick" as string | null,
      targetHandle: "tick" as string | null,
    };

    expect(isValidMachinaConnection({ ...base, source: null })).toBe(false);
    expect(isValidMachinaConnection({ ...base, target: null })).toBe(false);
    expect(isValidMachinaConnection({ ...base, sourceHandle: null })).toBe(false);
    expect(isValidMachinaConnection({ ...base, targetHandle: null })).toBe(false);
  });
});

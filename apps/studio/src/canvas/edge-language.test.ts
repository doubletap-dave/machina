import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaNode } from "@machina/core";
import { edgeSourcePortType, flowEdgeStyle } from "./edge-language.ts";

describe("flowEdgeStyle", () => {
  it("returns an empty stub for CLOCK", () => {
    expect(flowEdgeStyle("CLOCK")).toEqual({});
  });
});

describe("edgeSourcePortType", () => {
  it("looks up the source node's port type from the registry", () => {
    const registry = createRegistry();
    registerCoreKinds(registry);
    const nodes: MachinaNode[] = [
      {
        id: "clock",
        kind: "control.clock",
        version: 1,
        position: { x: 0, y: 0 },
        config: {},
      },
    ];

    expect(edgeSourcePortType(registry, nodes, "clock", "tick")).toBe("CLOCK");
    expect(flowEdgeStyle(edgeSourcePortType(registry, nodes, "clock", "tick") ?? "")).toEqual({});
  });
});

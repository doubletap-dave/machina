import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaNode } from "@machina/core";
import { edgeSourcePortType, flowEdgeStyle } from "./edge-language.ts";

describe("flowEdgeStyle", () => {
  it("colors OBSERVATION edges from port language", () => {
    expect(flowEdgeStyle("OBSERVATION")).toEqual({ stroke: "#4ec4d9", strokeWidth: 2 });
  });

  it("colors CLOCK edges from port language", () => {
    expect(flowEdgeStyle("CLOCK")).toEqual({ stroke: "#e4b84a", strokeWidth: 2 });
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
    expect(flowEdgeStyle(edgeSourcePortType(registry, nodes, "clock", "tick") ?? "")).toEqual({
      stroke: "#e4b84a",
      strokeWidth: 2,
    });
  });
});

describe("flowEdgeStyle unknown types", () => {
  it("does not throw when the port type is missing", () => {
    expect(flowEdgeStyle("")).toEqual({ stroke: "#8a8a8a", strokeWidth: 2 });
    expect(flowEdgeStyle("not-a-port")).toEqual({ stroke: "#8a8a8a", strokeWidth: 2 });
  });
});

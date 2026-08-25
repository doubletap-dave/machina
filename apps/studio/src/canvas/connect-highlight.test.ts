import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaNode } from "@machina/core";
import {
  ACTIVE_PORT_ATTR,
  activeTypeFromConnection,
  connectionLineStyleFor,
  endConnectHighlight,
  startConnectHighlight,
} from "./connect-highlight.ts";

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

describe("activeTypeFromConnection", () => {
  it("returns CLOCK for a clock tick handle", () => {
    const registry = testRegistry();
    const nodes = [node("clock", "control.clock")];

    expect(activeTypeFromConnection(registry, nodes, "clock", "tick")).toBe("CLOCK");
  });

  it("returns OBSERVATION for a perception observation handle", () => {
    const registry = testRegistry();
    const nodes = [node("eyes", "perception.perception")];

    expect(activeTypeFromConnection(registry, nodes, "eyes", "observation")).toBe("OBSERVATION");
  });

  it("returns undefined when the node or handle is missing", () => {
    const registry = testRegistry();
    const nodes = [node("clock", "control.clock")];

    expect(activeTypeFromConnection(registry, nodes, null, "tick")).toBeUndefined();
    expect(activeTypeFromConnection(registry, nodes, "clock", null)).toBeUndefined();
    expect(activeTypeFromConnection(registry, nodes, "missing", "tick")).toBeUndefined();
    expect(activeTypeFromConnection(registry, nodes, "clock", "nope")).toBeUndefined();
  });
});

describe("connect highlight start and end", () => {
  it("sets data-active-port-type on start and clears it on end", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-machina-canvas", "");

    startConnectHighlight(wrapper, "OBSERVATION");
    expect(wrapper.getAttribute(ACTIVE_PORT_ATTR)).toBe("OBSERVATION");

    endConnectHighlight(wrapper);
    expect(wrapper.hasAttribute(ACTIVE_PORT_ATTR)).toBe(false);
  });
});

describe("connectionLineStyleFor", () => {
  it("uses the source port language color", () => {
    expect(connectionLineStyleFor("OBSERVATION")).toEqual({ stroke: "#4ec4d9" });
    expect(connectionLineStyleFor(undefined)).toBeUndefined();
  });
});

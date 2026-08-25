import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { starterProject } from "../templates/starter.ts";
import { toFlowEdges } from "./flow-elements.ts";

function testRegistry() {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

describe("toFlowEdges", () => {
  it("styles starter-project edges without throwing", () => {
    const project = starterProject();
    const graph = project.graphs[0]!;
    expect(() => toFlowEdges(graph.edges, graph.nodes, testRegistry(), new Set())).not.toThrow();
  });

  it("does not throw when an edge source port cannot be resolved", () => {
    const project = starterProject();
    const graph = project.graphs[0]!;
    graph.edges.push({
      id: "orphan",
      sourceNode: "clock",
      sourcePort: "",
      targetNode: "world",
      targetPort: "tick",
    });
    expect(() => toFlowEdges(graph.edges, graph.nodes, testRegistry(), new Set())).not.toThrow();
  });
});

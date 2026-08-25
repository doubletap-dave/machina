import { describe, expect, it } from "vitest";
import { nationPreset } from "@machina/plugin-core";
import { materializePreset } from "./materialize-preset.ts";

describe("materializePreset", () => {
  it("remaps ids and attaches subgraph to parent graph", () => {
    const preset = nationPreset("Atlantic Federation");
    const parentGraphId = "entry";
    const materialized = materializePreset(preset, parentGraphId, { x: 100, y: 50 });

    expect(materialized.rootNodes).toHaveLength(1);
    expect(materialized.rootNodes[0]?.kind).toBe("entities.actor");
    expect(materialized.rootNodes[0]?.position).toEqual({ x: 100, y: 50 });
    expect(materialized.extraGraphs).toHaveLength(1);
    expect(materialized.extraGraphs[0]?.parentGraphId).toBe(parentGraphId);
    expect(materialized.extraGraphs[0]?.parentNodeId).toBe(materialized.rootNodes[0]?.id);

    const agentIds = materialized.extraGraphs[0]?.nodes
      .filter((node) => node.kind === "cognition.agent")
      .map((node) => node.id);
    expect(agentIds).toHaveLength(2);

    const allIds = new Set([
      ...materialized.rootNodes.map((node) => node.id),
      ...materialized.extraGraphs.flatMap((graph) => graph.nodes.map((node) => node.id)),
    ]);
    for (const edge of [...materialized.rootEdges, ...materialized.extraGraphs[0]?.edges ?? []]) {
      expect(allIds.has(edge.sourceNode)).toBe(true);
      expect(allIds.has(edge.targetNode)).toBe(true);
    }
  });
});

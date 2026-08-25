import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { compile } from "@machina/graph";
import type { MachinaProject, MachinaEdge, MachinaNode } from "@machina/core";
import { nationPreset, type Preset } from "../src/presets/index.ts";

function registry() {
  const r = createRegistry();
  registerCoreKinds(r);
  return r;
}

function edge(
  sourceNode: string,
  sourcePort: string,
  targetNode: string,
  targetPort: string,
): MachinaEdge {
  return {
    id: crypto.randomUUID(),
    sourceNode,
    sourcePort,
    targetNode,
    targetPort,
  };
}

function node(
  id: string,
  kind: string,
  config: unknown = {},
): MachinaNode {
  return {
    id,
    kind,
    version: 1,
    position: { x: 0, y: 0 },
    config,
  };
}

function nodesByKind(preset: Preset, kind: string): MachinaNode[] {
  const all = [...preset.graph.nodes, ...preset.extraGraphs.flatMap((g) => g.nodes)];
  return all.filter((n) => n.kind === kind);
}

function materializePreset(preset: Preset, entryGraphId: string) {
  const actor = preset.graph.nodes.find((n) => n.kind === "entities.actor");
  if (!actor) throw new Error("preset missing actor");

  const subgraph = preset.extraGraphs[0];
  if (!subgraph) throw new Error("preset missing subgraph");

  const patchedSubgraph = {
    ...subgraph,
    parentGraphId: entryGraphId,
    parentNodeId: actor.id,
  };

  return {
    actor,
    agents: nodesByKind(preset, "cognition.agent"),
    perception: nodesByKind(preset, "perception.perception")[0],
    graphs: [patchedSubgraph],
    crossEdges: preset.graph.edges,
  };
}

function projectWithTwoNations(): MachinaProject {
  const entryGraphId = "entry";
  const nationA = nationPreset("Atlantic Federation");
  const nationB = nationPreset("Vesper Union");

  const matA = materializePreset(nationA, entryGraphId);
  const matB = materializePreset(nationB, entryGraphId);

  const clockId = "clock";
  const worldId = "world";
  const relationshipId = "relationship";
  const diplomacyId = "diplomacy";

  const entryNodes: MachinaNode[] = [
    node(clockId, "control.clock", { period: "month" }),
    node(worldId, "entities.world"),
    matA.actor,
    matB.actor,
    node(relationshipId, "systems.relationship"),
    node(diplomacyId, "systems.system", { mechanic: "diplomacy" }),
  ];

  const entryEdges: MachinaEdge[] = [
    edge(clockId, "tick", worldId, "tick"),
    edge(clockId, "tick", matA.actor.id, "tick"),
    edge(clockId, "tick", matB.actor.id, "tick"),
    edge(clockId, "tick", diplomacyId, "tick"),
    edge(worldId, "state", matA.perception!.id, "state"),
    edge(worldId, "state", matB.perception!.id, "state"),
    edge(matA.actor.id, "ref", relationshipId, "actors"),
    edge(matB.actor.id, "ref", relationshipId, "actors"),
    edge(matA.actor.id, "ref", diplomacyId, "actors"),
    edge(matB.actor.id, "ref", diplomacyId, "actors"),
    ...matA.crossEdges,
    ...matB.crossEdges,
    ...matA.agents.map((a) => edge(a.id, "action", diplomacyId, "actions")),
    ...matB.agents.map((a) => edge(a.id, "action", diplomacyId, "actions")),
  ];

  return {
    schemaVersion: 1,
    id: "diplomacy-world",
    name: "Two Nations",
    entryGraphId,
    presetRefs: [nationA.id, nationB.id],
    graphs: [
      { id: entryGraphId, nodes: entryNodes, edges: entryEdges },
      ...matA.graphs,
      ...matB.graphs,
    ],
  };
}

describe("nationPreset", () => {
  it("materializes an actor with a cabinet subgraph", () => {
    const preset = nationPreset("Atlantic Federation");

    expect(preset.graph.nodes.some((n) => n.kind === "entities.actor")).toBe(true);
    expect(preset.builtin).toBe(true);

    const agentKinds = preset.extraGraphs[0]!.nodes
      .filter((n) => n.kind === "cognition.agent")
      .map((n) => n.kind);
    expect(agentKinds).toEqual(["cognition.agent", "cognition.agent"]);

    for (const agent of nodesByKind(preset, "cognition.agent")) {
      expect(agent.config).not.toHaveProperty("model");
    }
  });

  it("compiles with clock, world, two nations, relationship, and diplomacy", () => {
    const project = projectWithTwoNations();
    const result = compile(project, registry());

    expect("plan" in result).toBe(true);
    if ("plan" in result) {
      expect(result.plan.agents.length).toBe(4);
      expect(result.plan.systems.some((s) => s.kind === "systems.system")).toBe(
        true,
      );
    }
  });
});

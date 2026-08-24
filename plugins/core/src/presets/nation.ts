import type { GraphDocument, MachinaEdge, MachinaNode } from "@machina/core";
import type { Preset } from "./types.ts";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function pos(x: number, y: number) {
  return { x, y };
}

function edge(
  sourceNode: string,
  sourcePort: string,
  targetNode: string,
  targetPort: string,
): MachinaEdge {
  return {
    id: uid("edge"),
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
  position = pos(0, 0),
): MachinaNode {
  return { id, kind, version: 1, position, config };
}

function cabinetSubgraph(
  actorId: string,
  graphId: string,
  agents: { id: string; name: string; position: { x: number; y: number } }[],
): { subgraph: GraphDocument; crossEdges: MachinaEdge[] } {
  const personalityId = uid("personality");
  const goalId = uid("goal");
  const memoryId = uid("memory");
  const perceptionId = uid("perception");

  const subgraphNodes: MachinaNode[] = [
    node(personalityId, "cognition.personality", {}, pos(0, 0)),
    node(goalId, "cognition.goal", {}, pos(0, 80)),
    node(memoryId, "cognition.memory", {}, pos(0, 160)),
    node(perceptionId, "perception.perception", {}, pos(0, 240)),
    ...agents.map((a) =>
      node(a.id, "cognition.agent", { name: a.name, model: "mock" }, a.position),
    ),
  ];

  const subgraphEdges: MachinaEdge[] = [];
  const crossEdges: MachinaEdge[] = [
    edge(personalityId, "traits", actorId, "personality"),
    edge(goalId, "goals", actorId, "goals"),
    edge(memoryId, "memory", actorId, "memory"),
  ];

  for (const agent of agents) {
    subgraphEdges.push(
      edge(personalityId, "traits", agent.id, "personality"),
      edge(goalId, "goals", agent.id, "goals"),
      edge(memoryId, "memory", agent.id, "memory"),
      edge(perceptionId, "observation", agent.id, "observation"),
    );
  }

  const subgraph: GraphDocument = {
    id: graphId,
    parentNodeId: actorId,
    nodes: subgraphNodes,
    edges: subgraphEdges,
  };

  return { subgraph, crossEdges };
}

export function nationPreset(name: string): Preset {
  const presetId = uid("nation");
  const actorId = uid("actor");
  const subgraphId = uid("subgraph");
  const leaderId = uid("leader");
  const advisorId = uid("advisor");

  const actor = node(actorId, "entities.actor", { name }, pos(0, 0));
  actor.subgraphId = subgraphId;

  const { subgraph, crossEdges } = cabinetSubgraph(actorId, subgraphId, [
    { id: leaderId, name: "Leader", position: pos(200, 0) },
    { id: advisorId, name: "Advisor", position: pos(200, 80) },
  ]);

  return {
    id: presetId,
    name,
    category: "Entities",
    builtin: true,
    graph: {
      id: uid("graph"),
      nodes: [actor],
      edges: crossEdges,
    },
    extraGraphs: [subgraph],
  };
}

export function cabinetPreset(name: string): Preset {
  const presetId = uid("cabinet");
  const actorId = uid("actor");
  const subgraphId = uid("subgraph");
  const leaderId = uid("leader");
  const advisorId = uid("advisor");

  const actor = node(actorId, "entities.actor", { name }, pos(0, 0));
  actor.subgraphId = subgraphId;

  const { subgraph, crossEdges } = cabinetSubgraph(actorId, subgraphId, [
    { id: leaderId, name: "Leader", position: pos(200, 0) },
    { id: advisorId, name: "Advisor", position: pos(200, 80) },
  ]);

  return {
    id: presetId,
    name,
    category: "Cognition",
    builtin: true,
    graph: {
      id: uid("graph"),
      nodes: [actor],
      edges: crossEdges,
    },
    extraGraphs: [subgraph],
  };
}

export function agencyPreset(name: string): Preset {
  const presetId = uid("agency");
  const actorId = uid("actor");
  const subgraphId = uid("subgraph");
  const agentId = uid("agent");

  const actor = node(actorId, "entities.actor", { name }, pos(0, 0));
  actor.subgraphId = subgraphId;

  const { subgraph, crossEdges } = cabinetSubgraph(actorId, subgraphId, [
    { id: agentId, name: "Agent", position: pos(200, 0) },
  ]);

  return {
    id: presetId,
    name,
    category: "Cognition",
    builtin: true,
    graph: {
      id: uid("graph"),
      nodes: [actor],
      edges: crossEdges,
    },
    extraGraphs: [subgraph],
  };
}

export function listBuiltinPresets(): Preset[] {
  return [
    nationPreset("Atlantic Federation"),
    nationPreset("Vesper Union"),
    cabinetPreset("Example Cabinet"),
    agencyPreset("Example Agency"),
  ];
}

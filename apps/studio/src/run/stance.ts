import type { MachinaProject } from "@machina/core";

export type Stance = { mode: "watch" | "god" | "possess"; nodeId?: string };

function allAgentIds(project: MachinaProject): string[] {
  const ids: string[] = [];
  for (const graph of project.graphs) {
    for (const node of graph.nodes) {
      if (node.kind === "cognition.agent") {
        ids.push(node.id);
      }
    }
  }
  return ids;
}

function findNode(project: MachinaProject, nodeId: string) {
  for (const graph of project.graphs) {
    const node = graph.nodes.find((candidate) => candidate.id === nodeId);
    if (node) {
      return node;
    }
  }
  return undefined;
}

export function legalPossessTargets(
  project: MachinaProject,
  selectedNodeId: string | null,
): string[] {
  if (selectedNodeId === null) {
    return allAgentIds(project);
  }

  const selected = findNode(project, selectedNodeId);
  if (!selected) {
    return [];
  }

  if (selected.kind === "cognition.agent") {
    return [selected.id];
  }

  if (selected.subgraphId) {
    const subgraph = project.graphs.find((graph) => graph.id === selected.subgraphId);
    if (!subgraph) {
      return [];
    }
    return subgraph.nodes
      .filter((node) => node.kind === "cognition.agent")
      .map((node) => node.id);
  }

  return [];
}

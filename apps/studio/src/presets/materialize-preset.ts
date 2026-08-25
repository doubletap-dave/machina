import type { GraphDocument, MachinaEdge, MachinaNode } from "@machina/core";
import type { Preset } from "@machina/plugin-core";

export type MaterializedPreset = {
  rootNodes: MachinaNode[];
  rootEdges: MachinaEdge[];
  extraGraphs: GraphDocument[];
};

export function materializePreset(
  preset: Preset,
  parentGraphId: string,
  origin: { x: number; y: number },
): MaterializedPreset {
  const idMap = new Map<string, string>();

  const remapId = (id: string): string => {
    const existing = idMap.get(id);
    if (existing) {
      return existing;
    }
    const next = crypto.randomUUID();
    idMap.set(id, next);
    return next;
  };

  const remapNode = (node: MachinaNode): MachinaNode => ({
    ...node,
    id: remapId(node.id),
    position: {
      x: node.position.x + origin.x,
      y: node.position.y + origin.y,
    },
    subgraphId: node.subgraphId ? remapId(node.subgraphId) : undefined,
  });

  const remapEdge = (edge: MachinaEdge): MachinaEdge => ({
    ...edge,
    id: crypto.randomUUID(),
    sourceNode: remapId(edge.sourceNode),
    targetNode: remapId(edge.targetNode),
  });

  const rootNodes = preset.graph.nodes.map(remapNode);
  const rootEdges = preset.graph.edges.map(remapEdge);
  const extraGraphs = preset.extraGraphs.map((graph) => ({
    ...graph,
    id: remapId(graph.id),
    parentGraphId,
    parentNodeId: graph.parentNodeId ? remapId(graph.parentNodeId) : undefined,
    nodes: graph.nodes.map(remapNode),
    edges: graph.edges.map(remapEdge),
  }));

  return { rootNodes, rootEdges, extraGraphs };
}

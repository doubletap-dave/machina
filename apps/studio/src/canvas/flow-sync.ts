import type { GraphDocument, MachinaNode } from "@machina/core";
import type { Edge, Node } from "@xyflow/react";

type FlowMachinaData = {
  machina?: MachinaNode;
};

export function snapPosition(
  p: { x: number; y: number },
  grid = 16,
): { x: number; y: number } {
  return { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid };
}

export function graphFromFlow(
  nodes: Node[],
  edges: Edge[],
  previous: GraphDocument,
): GraphDocument {
  const previousById = new Map(previous.nodes.map((node) => [node.id, node]));
  return {
    ...previous,
    nodes: nodes.flatMap((node) => {
      const prev = previousById.get(node.id);
      if (prev) {
        return [{ ...prev, position: node.position }];
      }
      const machina = (node.data as FlowMachinaData | undefined)?.machina;
      if (!machina) {
        return [];
      }
      return [{ ...machina, id: node.id, position: node.position }];
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sourceNode: edge.source,
      sourcePort: edge.sourceHandle ?? "",
      targetNode: edge.target,
      targetPort: edge.targetHandle ?? "",
    })),
  };
}

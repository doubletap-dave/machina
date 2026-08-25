import type { GraphDocument } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import type { Edge, Node } from "@xyflow/react";
import { edgeSourcePortType, flowEdgeStyle } from "./edge-language.ts";

export function toFlowNodes(
  nodes: GraphDocument["nodes"],
  registry: NodeRegistry,
  selectedNodeIds: ReadonlySet<string>,
): Node[] {
  return nodes.map((node) => {
    const def = registry.getOrThrow(node.kind, node.version);
    const config = node.config as Record<string, string | undefined>;
    const label =
      node.kind === "entities.actor" && config.name ? String(config.name) : def.metadata.name;
    return {
      id: node.id,
      type: "machina",
      position: node.position,
      selected: selectedNodeIds.has(node.id),
      data: { label, ports: def.ports },
    };
  });
}

export function toFlowEdges(
  edges: GraphDocument["edges"],
  nodes: GraphDocument["nodes"],
  registry: NodeRegistry,
  selectedEdgeIds: ReadonlySet<string>,
): Edge[] {
  return edges.map((edge) => {
    const portType = edgeSourcePortType(registry, nodes, edge.sourceNode, edge.sourcePort);
    return {
      id: edge.id,
      source: edge.sourceNode,
      target: edge.targetNode,
      sourceHandle: edge.sourcePort,
      targetHandle: edge.targetPort,
      selected: selectedEdgeIds.has(edge.id),
      style: flowEdgeStyle(portType ?? ""),
    };
  });
}

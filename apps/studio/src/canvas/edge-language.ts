import type { MachinaNode } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";

export function flowEdgeStyle(_portType: string): { stroke?: string } {
  return {};
}

export function edgeSourcePortType(
  registry: NodeRegistry,
  nodes: MachinaNode[],
  sourceNodeId: string,
  sourcePort: string,
): string | undefined {
  const node = nodes.find((candidate) => candidate.id === sourceNodeId);
  if (!node) {
    return undefined;
  }
  const def = registry.get(node.kind, node.version);
  return def?.ports[sourcePort]?.type;
}

import type { MachinaNode, PortType } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import { portLanguage } from "@machina/ui";

export function flowEdgeStyle(portType: string): { stroke: string; strokeWidth: number } {
  const lang = portLanguage(portType as PortType);
  return { stroke: lang.color, strokeWidth: 2 };
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

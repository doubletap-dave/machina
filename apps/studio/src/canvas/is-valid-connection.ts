import { matchPorts, type MachinaNode } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";

export function isValidMachinaConnection(opts: {
  registry: NodeRegistry;
  nodes: MachinaNode[];
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}): boolean {
  const { registry, nodes, source, target, sourceHandle, targetHandle } = opts;
  if (!source || !target || !sourceHandle || !targetHandle) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) {
    return false;
  }

  const sourceDef = registry.get(sourceNode.kind, sourceNode.version);
  const targetDef = registry.get(targetNode.kind, targetNode.version);
  if (!sourceDef || !targetDef) {
    return false;
  }

  const sourcePort = sourceDef.ports[sourceHandle];
  const targetPort = targetDef.ports[targetHandle];
  if (!sourcePort || !targetPort) {
    return false;
  }

  return matchPorts(sourcePort, targetPort) === null;
}

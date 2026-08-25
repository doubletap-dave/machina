import type { MachinaNode, PortType } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import { portLanguage } from "@machina/ui";
import { edgeSourcePortType } from "./edge-language.ts";

export const ACTIVE_PORT_ATTR = "data-active-port-type";

export function activeTypeFromConnection(
  registry: NodeRegistry,
  nodes: MachinaNode[],
  nodeId: string | null,
  handleId: string | null,
): string | undefined {
  if (!nodeId || !handleId) {
    return undefined;
  }
  return edgeSourcePortType(registry, nodes, nodeId, handleId);
}

export function startConnectHighlight(el: HTMLElement | null, type: string | undefined): void {
  if (!el) {
    return;
  }
  if (type) {
    el.setAttribute(ACTIVE_PORT_ATTR, type);
  } else {
    el.removeAttribute(ACTIVE_PORT_ATTR);
  }
}

export function endConnectHighlight(el: HTMLElement | null): void {
  el?.removeAttribute(ACTIVE_PORT_ATTR);
}

export function connectionLineStyleFor(type: string | undefined): { stroke: string } | undefined {
  if (!type) {
    return undefined;
  }
  return { stroke: portLanguage(type as PortType).color };
}

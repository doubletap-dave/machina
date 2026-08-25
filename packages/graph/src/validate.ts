import {
  matchPorts,
  type MachinaEdge,
  type MachinaError,
  type MachinaNode,
  type PortType,
  type Wire,
} from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import {
  actorNeedsNameCopy,
  goalHasNoStatementCopy,
  missingClockCopy,
  unknownKindCopy,
  versionMismatchCopy,
} from "@machina/ui";
import type { FlatGraph } from "./flatten.ts";

type NodeContext = {
  nodesById: Map<string, MachinaNode>;
  edges: MachinaEdge[];
  registry: NodeRegistry;
};

function resolveNodeDef(
  node: MachinaNode,
  registry: NodeRegistry,
): { def?: ReturnType<NodeRegistry["get"]>; error?: MachinaError } {
  const def = registry.get(node.kind, node.version);
  if (def) return { def };

  const anyVersion = registry.get(node.kind);
  if (anyVersion) {
    return {
      error: {
        code: "VERSION_MISMATCH",
        message: versionMismatchCopy(),
        nodeId: node.id,
      },
    };
  }

  return {
    error: {
      code: "UNKNOWN_KIND",
      message: unknownKindCopy(node.kind),
      nodeId: node.id,
    },
  };
}

export function validateKinds(
  nodes: MachinaNode[],
  registry: NodeRegistry,
): MachinaError[] {
  const errors: MachinaError[] = [];
  for (const node of nodes) {
    const { error } = resolveNodeDef(node, registry);
    if (error) errors.push(error);
  }
  return errors;
}

export function validateEdges(ctx: NodeContext): MachinaError[] {
  const errors: MachinaError[] = [];
  const inboundByTarget = new Map<string, MachinaEdge[]>();

  for (const edge of ctx.edges) {
    const source = ctx.nodesById.get(edge.sourceNode);
    const target = ctx.nodesById.get(edge.targetNode);
    if (!source || !target) continue;

    const sourceResult = resolveNodeDef(source, ctx.registry);
    const targetResult = resolveNodeDef(target, ctx.registry);
    if (sourceResult.error || targetResult.error) continue;

    const sourcePort = sourceResult.def!.ports[edge.sourcePort];
    const targetPort = targetResult.def!.ports[edge.targetPort];
    if (!sourcePort || !targetPort) continue;

    let mismatch = matchPorts(sourcePort, targetPort);
    if (
      mismatch?.code === "PORT_DIRECTION" &&
      sourcePort.type === "RESOURCE" &&
      target.kind === "cognition.personality" &&
      edge.targetPort === "traits"
    ) {
      mismatch = matchPorts(sourcePort, {
        ...targetPort,
        dir: "in",
        type: "PERSONALITY",
      });
    }
    if (mismatch) {
      errors.push({
        ...mismatch,
        nodeId: target.id,
        port: edge.targetPort,
      });
    }

    const key = `${edge.targetNode}:${edge.targetPort}`;
    const list = inboundByTarget.get(key) ?? [];
    list.push(edge);
    inboundByTarget.set(key, list);
  }

  for (const [key, inbound] of inboundByTarget) {
    if (inbound.length < 2) continue;
    const [targetNodeId, targetPort] = key.split(":");
    const target = ctx.nodesById.get(targetNodeId!);
    if (!target) continue;
    const targetResult = resolveNodeDef(target, ctx.registry);
    if (!targetResult.def) continue;
    const portDef = targetResult.def.ports[targetPort!];
    if (portDef?.cardinality === "exclusive") {
      errors.push({
        code: "EXCLUSIVE_PORT",
        message: "This input already has a connection.",
        nodeId: targetNodeId,
        port: targetPort,
      });
    }
  }

  return errors;
}

export function validateFlatGraph(
  flat: FlatGraph,
  registry: NodeRegistry,
  clock?: MachinaNode,
): MachinaError[] {
  if (!clock) {
    return [{ code: "MISSING_CLOCK", message: missingClockCopy() }];
  }

  const nodesById = new Map(flat.nodes.map((n) => [n.id, n]));
  const kindErrors = validateKinds(flat.nodes, registry);
  const edgeErrors = validateEdges({
    nodesById,
    edges: flat.edges,
    registry,
  });
  const errors = [...kindErrors, ...edgeErrors];

  for (const node of flat.nodes) {
    if (node.kind === "entities.actor") {
      const name = String((node.config as { name?: string }).name ?? "").trim();
      if (name === "") {
        errors.push({
          code: "ACTOR_NAME",
          message: actorNeedsNameCopy(),
          nodeId: node.id,
        });
      }
    }
    if (node.kind === "cognition.goal") {
      const statement = String(
        (node.config as { statement?: string }).statement ?? "",
      ).trim();
      if (statement === "") {
        errors.push({
          code: "GOAL_STATEMENT",
          message: goalHasNoStatementCopy(),
          nodeId: node.id,
        });
      }
    }
  }

  return errors;
}

export function edgeToWire(
  edge: MachinaEdge,
  ctx: NodeContext,
): Wire | undefined {
  const source = ctx.nodesById.get(edge.sourceNode);
  if (!source) return undefined;
  const sourceResult = resolveNodeDef(source, ctx.registry);
  if (!sourceResult.def) return undefined;
  const sourcePort = sourceResult.def.ports[edge.sourcePort];
  if (!sourcePort) return undefined;
  return {
    from: { nodeId: edge.sourceNode, port: edge.sourcePort },
    to: { nodeId: edge.targetNode, port: edge.targetPort },
    portType: sourcePort.type,
  };
}

export function inboundWires(nodeId: string, ctx: NodeContext): Wire[] {
  return ctx.edges
    .filter((e) => e.targetNode === nodeId)
    .map((e) => edgeToWire(e, ctx))
    .filter((w): w is Wire => w !== undefined);
}

export const PACKET_PORT_TYPES: PortType[] = [
  "OBSERVATION",
  "MEMORY",
  "GOAL",
  "PERSONALITY",
];

export function packetWires(nodeId: string, ctx: NodeContext): Wire[] {
  return inboundWires(nodeId, ctx).filter((w) =>
    PACKET_PORT_TYPES.includes(w.portType),
  );
}

export function findActorRef(
  agentId: string,
  flat: FlatGraph,
  ctx: NodeContext,
): string {
  const portalParent = flat.portalParent.get(agentId);
  if (portalParent) return portalParent;

  for (const node of flat.nodes) {
    if (node.kind !== "entities.actor") continue;
    const hasRefEdge = ctx.edges.some(
      (e) => e.sourceNode === node.id && e.sourcePort === "ref",
    );
    if (hasRefEdge) return node.id;
  }

  return agentId;
}

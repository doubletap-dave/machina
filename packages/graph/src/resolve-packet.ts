import {
  emptyAgentPacket,
  type AgentPacket,
  type MachinaEdge,
  type MachinaNode,
} from "@machina/core";

export type ResolvePacketCtx = {
  nodesById: Map<string, MachinaNode>;
  edges: MachinaEdge[];
  actorRef?: string;
};

function actorIdFor(agentId: string, ctx: ResolvePacketCtx): string {
  if (ctx.actorRef) return ctx.actorRef;
  for (const node of ctx.nodesById.values()) {
    if (node.kind !== "entities.actor") continue;
    const hasRefEdge = ctx.edges.some(
      (e) => e.sourceNode === node.id && e.sourcePort === "ref",
    );
    if (hasRefEdge) return node.id;
  }
  return agentId;
}

export function resolveAgentPacket(
  agentId: string,
  ctx: ResolvePacketCtx,
): AgentPacket {
  const packet = emptyAgentPacket();
  const targets = new Set([agentId, actorIdFor(agentId, ctx)]);
  const seen = new Set<string>();
  const goals: unknown[] = [];

  for (const edge of ctx.edges) {
    if (!targets.has(edge.targetNode)) continue;
    if (seen.has(edge.sourceNode)) continue;
    const source = ctx.nodesById.get(edge.sourceNode);
    if (!source) continue;
    seen.add(edge.sourceNode);

    if (source.kind === "cognition.personality") {
      packet.personality = source.config;
    } else if (source.kind === "cognition.goal") {
      goals.push(source.config);
    } else if (source.kind === "cognition.memory") {
      packet.memory = source.config;
    }
  }

  if (goals.length === 1) {
    packet.goals = goals[0];
  } else if (goals.length > 1) {
    packet.goals = goals;
  }

  return packet;
}

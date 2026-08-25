import { type MachinaNode, type SimulationPlan, type Wire } from "@machina/core";
import type { NodeDefinition, NodeRegistry } from "@machina/node-sdk";
import type { FlatGraph } from "./flatten.ts";
import { resolveAgentPacket } from "./resolve-packet.ts";

type NodeContext = {
  nodesById: Map<string, MachinaNode>;
  edges: import("@machina/core").MachinaEdge[];
  registry: NodeRegistry;
};

type PlanBucket = "system" | "agent" | "perception" | "analysis" | "skip";

function classifyNode(node: MachinaNode, def: NodeDefinition): PlanBucket {
  if (node.kind === "analysis.inspector" || node.kind === "analysis.logger") {
    return "analysis";
  }
  if (node.kind === "perception.perception") {
    return "perception";
  }
  if (def.runtime === "agent") {
    return "agent";
  }
  if (def.runtime === "none") {
    return "skip";
  }
  if (
    (def.runtime === "mechanical" || def.runtime === "actor") &&
    node.kind !== "control.clock"
  ) {
    return "system";
  }
  return "skip";
}

export function buildSimulationPlan(
  projectId: string,
  clock: MachinaNode,
  flat: FlatGraph,
  ctx: NodeContext,
  inboundWires: (nodeId: string) => Wire[],
  packetWires: (nodeId: string) => Wire[],
  actorRefFor: (agentId: string) => string,
): SimulationPlan {
  const plan: SimulationPlan = {
    projectId,
    clock: { nodeId: clock.id, config: clock.config },
    systems: [],
    agents: [],
    perception: [],
    analysis: [],
  };

  for (const node of flat.nodes) {
    const def = ctx.registry.get(node.kind, node.version);
    if (!def) continue;

    const bucket = classifyNode(node, def);
    switch (bucket) {
      case "system":
        plan.systems.push({
          nodeId: node.id,
          kind: node.kind,
          config: node.config,
          wires: inboundWires(node.id),
        });
        break;
      case "perception":
        plan.perception.push({
          nodeId: node.id,
          config: node.config,
          wires: inboundWires(node.id),
        });
        break;
      case "agent": {
        const actorRef = actorRefFor(node.id);
        plan.agents.push({
          nodeId: node.id,
          actorRef,
          graphRef: `agent:${node.id}`,
          packetWires: packetWires(node.id),
          packet: resolveAgentPacket(node.id, {
            nodesById: ctx.nodesById,
            edges: ctx.edges,
            actorRef,
          }),
        });
        break;
      }
      case "analysis":
        plan.analysis.push({
          nodeId: node.id,
          kind: node.kind,
          config: node.config,
          wires: inboundWires(node.id),
        });
        break;
    }
  }

  return plan;
}

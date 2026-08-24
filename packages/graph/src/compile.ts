import type { MachinaError, MachinaProject, SimulationPlan } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import { buildSimulationPlan } from "./classify.ts";
import { flattenFromEntry, findClockOnEntry } from "./flatten.ts";
import {
  findActorRef,
  inboundWires,
  packetWires,
  validateFlatGraph,
} from "./validate.ts";

export function compile(
  project: MachinaProject,
  registry: NodeRegistry,
): { plan: SimulationPlan } | { errors: MachinaError[] } {
  const clock = findClockOnEntry(project);
  const flat = flattenFromEntry(project);
  const errors = validateFlatGraph(flat, registry, clock);
  if (errors.length > 0) {
    return { errors };
  }

  const clockNode = clock!;
  const nodesById = new Map(flat.nodes.map((n) => [n.id, n]));
  const ctx = { nodesById, edges: flat.edges, registry };

  const plan = buildSimulationPlan(
    project.id,
    clockNode,
    flat,
    ctx,
    (nodeId) => inboundWires(nodeId, ctx),
    (nodeId) => packetWires(nodeId, ctx),
    (agentId) => findActorRef(agentId, flat, ctx),
  );

  return { plan };
}

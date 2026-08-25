import { emptyAgentPacket, type AgentPacket, type SimulationPlan } from "@machina/core";
import type { InstrumentMsg } from "./instrument.ts";
import { createKernel } from "./kernel.ts";
import type { Kernel, ThinkFn } from "./types.ts";

export function actorIdsFromPlan(plan: SimulationPlan): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const agent of plan.agents) {
    if (seen.has(agent.actorRef)) {
      continue;
    }
    seen.add(agent.actorRef);
    ids.push(agent.actorRef);
  }
  return ids;
}

function stringField(config: unknown, key: string): string | undefined {
  if (config === null || typeof config !== "object" || !(key in config)) {
    return undefined;
  }
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(config: unknown, key: string): number | undefined {
  if (config === null || typeof config !== "object" || !(key in config)) {
    return undefined;
  }
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function loggerFlags(plan: SimulationPlan): { logActions: boolean; logEvents: boolean } {
  let logActions = false;
  let logEvents = false;
  for (const node of plan.analysis) {
    if (node.kind !== "analysis.logger") {
      continue;
    }
    const record = stringField(node.config, "record");
    const mode = record === "actions" || record === "events" || record === "both" ? record : "both";
    if (mode === "actions" || mode === "both") {
      logActions = true;
    }
    if (mode === "events" || mode === "both") {
      logEvents = true;
    }
  }
  return { logActions, logEvents };
}

export function createKernelFromPlan(
  plan: SimulationPlan,
  opts: { seed: number; think: ThinkFn; onInstrument?: (msg: InstrumentMsg) => void },
): Kernel {
  const actorIds = actorIdsFromPlan(plan);
  const actorNames: Record<string, string> = {};
  const packets: Record<string, AgentPacket> = {};
  for (const actorId of actorIds) {
    const system = plan.systems.find(
      (entry) => entry.kind === "entities.actor" && entry.nodeId === actorId,
    );
    actorNames[actorId] = stringField(system?.config, "name") ?? actorId;
    const agent = plan.agents.find((entry) => entry.actorRef === actorId);
    packets[actorId] = agent?.packet ?? emptyAgentPacket();
  }
  return createKernel({
    seed: opts.seed,
    actorIds,
    think: opts.think,
    onInstrument: opts.onInstrument,
    actorNames,
    packets,
    fog: numberField(plan.perception[0]?.config, "fog"),
    ...loggerFlags(plan),
  });
}

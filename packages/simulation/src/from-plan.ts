import type { SimulationPlan } from "@machina/core";
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

export function createKernelFromPlan(
  plan: SimulationPlan,
  opts: { seed: number; think: ThinkFn },
): Kernel {
  return createKernel({
    seed: opts.seed,
    actorIds: actorIdsFromPlan(plan),
    think: opts.think,
  });
}

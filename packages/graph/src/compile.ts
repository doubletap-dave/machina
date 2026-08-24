import type {
  MachinaError,
  MachinaProject,
  SimulationPlan,
} from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import { missingClockCopy } from "@machina/ui";

export function compile(
  project: MachinaProject,
  registry: NodeRegistry,
): { plan: SimulationPlan } | { errors: MachinaError[] } {
  const entryGraph = project.graphs.find((g) => g.id === project.entryGraphId);
  if (!entryGraph) {
    return {
      errors: [
        {
          code: "MISSING_ENTRY_GRAPH",
          message: "This world needs a Clock before it can run.",
        },
      ],
    };
  }

  const clocks = entryGraph.nodes.filter((n) => n.kind === "control.clock");
  if (clocks.length === 0) {
    return {
      errors: [
        {
          code: "MISSING_CLOCK",
          message: missingClockCopy(),
        },
      ],
    };
  }

  const clock = clocks[0]!;
  return {
    plan: {
      projectId: project.id,
      clock: { nodeId: clock.id, config: clock.config },
      systems: [],
      agents: [],
      perception: [],
      analysis: [],
    },
  };
}

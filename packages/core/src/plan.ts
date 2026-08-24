import type { Wire } from "./ir.ts";

export type SimulationPlan = {
  projectId: string;
  clock: { nodeId: string; config: unknown };
  systems: Array<{ nodeId: string; kind: string; config: unknown; wires: Wire[] }>;
  agents: Array<{
    nodeId: string;
    actorRef: string;
    graphRef: string;
    packetWires: Wire[];
  }>;
  perception: Array<{ nodeId: string; config: unknown; wires: Wire[] }>;
  analysis: Array<{ nodeId: string; kind: string }>;
};

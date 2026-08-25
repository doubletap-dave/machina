import type { Wire } from "./ir.ts";

export type AgentPacket = {
  personality: unknown;
  goals: unknown;
  memory: unknown;
};

export const emptyAgentPacket = (): AgentPacket => ({
  personality: null,
  goals: null,
  memory: null,
});

export type SimulationPlan = {
  projectId: string;
  clock: { nodeId: string; config: unknown };
  systems: Array<{ nodeId: string; kind: string; config: unknown; wires: Wire[] }>;
  agents: Array<{
    nodeId: string;
    actorRef: string;
    graphRef: string;
    packetWires: Wire[];
    packet: AgentPacket;
  }>;
  perception: Array<{ nodeId: string; config: unknown; wires: Wire[] }>;
  analysis: Array<{ nodeId: string; kind: string; config: unknown; wires: Wire[] }>;
};

export type ObservationPacket = {
  actorId: string;
  turn: number;
  observations: Array<{
    attribute: string;
    value: number | string | boolean;
    confidence: number;
    ageTurns: number;
    source: string;
  }>;
  memory: unknown;
  goals: unknown;
  personality: unknown;
  legalActions: string[];
};

export type AgentAction = {
  actorId: string;
  type: string;
  params: Record<string, unknown>;
};

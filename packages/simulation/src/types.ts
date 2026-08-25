import type { AgentAction, ObservationPacket } from "@machina/core";
import type { MachinaEvent } from "@machina/core";

export type TrueWorldState = {
  turn: number;
  actors: Record<string, { name: string; resources: Record<string, number> }>;
};

export type ThinkFn = (input: {
  nodeId: string;
  packet: ObservationPacket;
}) => Promise<AgentAction>;

export type Kernel = {
  runTurn(): Promise<{ events: MachinaEvent[]; snapshot: TrueWorldState }>;
  applyIntervention(payload: { path: string; value: unknown; noticeable: boolean }): void;
  rewind(turn: number): void;
  getTruth(): TrueWorldState;
  peekPacket(actorId: string): ObservationPacket;
  paused: boolean;
};

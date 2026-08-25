import type { ObservationPacket } from "./packets.ts";

export type InstrumentMsg =
  | { type: "turn"; turn: number }
  | { type: "node-active"; nodeId: string }
  | { type: "edge-pulse"; from: string; to: string; portType: string }
  | { type: "possess-wait"; nodeId: string; packet: ObservationPacket }
  | { type: "error"; message: string };

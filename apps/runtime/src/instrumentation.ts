import type { InstrumentMsg } from "@machina/core";

export type WsInstrumentPayload = InstrumentMsg;

export function toWs(msg: InstrumentMsg): WsInstrumentPayload {
  switch (msg.type) {
    case "turn":
      return { type: "turn", turn: msg.turn };
    case "node-active":
      return { type: "node-active", nodeId: msg.nodeId };
    case "edge-pulse":
      return { type: "edge-pulse", from: msg.from, to: msg.to, portType: msg.portType };
    case "possess-wait":
      return { type: "possess-wait", nodeId: msg.nodeId, packet: msg.packet };
    case "error":
      return { type: "error", message: msg.message };
  }
}

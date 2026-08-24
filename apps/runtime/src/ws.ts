import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { MachinaEvent, ObservationPacket } from "@machina/core";

export type WsMessage =
  | { type: "turn"; turn: number }
  | { type: "event"; event: MachinaEvent }
  | { type: "possess-wait"; nodeId: string; packet: ObservationPacket }
  | { type: "error"; message: string };

function broadcast(clients: Set<WebSocket>, message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  server.on("upgrade", (req, socket, head) => {
    const path = req.url?.split("?")[0];
    if (path !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      clients.add(ws);
      ws.on("close", () => clients.delete(ws));
      wss.emit("connection", ws, req);
    });
  });

  server.on("turn", (payload: { runId: string; turn: number }) => {
    broadcast(clients, { type: "turn", turn: payload.turn });
  });

  server.on("event", (event: MachinaEvent) => {
    broadcast(clients, { type: "event", event });
  });

  return wss;
}

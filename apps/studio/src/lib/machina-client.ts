import { MachinaClient } from "@machina/client";

let client: MachinaClient | undefined;

export function getStudioClient(): MachinaClient {
  if (!client) {
    client = new MachinaClient({
      baseUrl: "/api/runtime",
      wsUrl: process.env.NEXT_PUBLIC_MACHINA_WS ?? "ws://127.0.0.1:4000/ws",
    });
  }
  return client;
}

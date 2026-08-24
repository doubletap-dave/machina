import { defineNode } from "@machina/node-sdk";
import { baseConfigSchema } from "./schemas.ts";

export const inspectorKind = defineNode({
  type: "analysis.inspector",
  version: 1,
  metadata: { name: "Inspector", category: "Analysis" },
  ports: {
    state: {
      name: "state",
      dir: "in",
      type: "WORLD_STATE",
      cardinality: "fan-in",
      label: "what to inspect",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "none",
});

export const loggerKind = defineNode({
  type: "analysis.logger",
  version: 1,
  metadata: { name: "Logger", category: "Analysis" },
  ports: {
    events: {
      name: "events",
      dir: "in",
      type: "EVENT",
      cardinality: "fan-in",
      label: "what to record",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

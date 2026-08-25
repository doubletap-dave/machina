import { defineNode } from "@machina/node-sdk";
import { inspectorConfigSchema, loggerConfigSchema } from "./schemas.ts";

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
      label: "State",
    },
  },
  configSchema: inspectorConfigSchema,
  fields: [{ key: "title", label: "Title", type: "string", default: "Inspector" }],
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
      label: "Events",
    },
  },
  configSchema: loggerConfigSchema,
  fields: [
    {
      key: "record",
      label: "Record",
      type: "enum",
      options: ["events", "actions", "both"],
      default: "both",
    },
  ],
  runtime: "mechanical",
});

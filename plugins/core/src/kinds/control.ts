import { defineNode } from "@machina/node-sdk";
import { baseConfigSchema, clockConfigSchema } from "./schemas.ts";

export const clockKind = defineNode({
  type: "control.clock",
  version: 1,
  metadata: { name: "Clock", category: "Control" },
  ports: {
    tick: {
      name: "tick",
      dir: "out",
      type: "CLOCK",
      cardinality: "fan-out",
      label: "when time moves",
    },
  },
  configSchema: clockConfigSchema,
  runtime: "mechanical",
});

export const eventKind = defineNode({
  type: "control.event",
  version: 1,
  metadata: { name: "Event", category: "Control" },
  ports: {
    events: {
      name: "events",
      dir: "in",
      type: "EVENT",
      cardinality: "fan-in",
      label: "what happened",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

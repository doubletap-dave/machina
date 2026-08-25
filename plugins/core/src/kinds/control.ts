import { defineNode } from "@machina/node-sdk";
import { clockConfigSchema, eventConfigSchema } from "./schemas.ts";

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
      label: "Tick",
    },
  },
  configSchema: clockConfigSchema,
  fields: [
    {
      key: "period",
      label: "Period",
      type: "enum",
      options: ["turn", "day", "week", "month", "year"],
      default: "month",
    },
  ],
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
      label: "Events",
    },
  },
  configSchema: eventConfigSchema,
  fields: [
    { key: "name", label: "Name", type: "string", default: "Event" },
    { key: "description", label: "Description", type: "string", default: "" },
  ],
  runtime: "mechanical",
});

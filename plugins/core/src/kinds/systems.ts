import { defineNode } from "@machina/node-sdk";
import { relationshipConfigSchema, systemConfigSchema } from "./schemas.ts";

export const systemKind = defineNode({
  type: "systems.system",
  version: 1,
  metadata: { name: "System", category: "Systems" },
  ports: {
    tick: {
      name: "tick",
      dir: "in",
      type: "CLOCK",
      cardinality: "exclusive",
      label: "Tick",
    },
    actors: {
      name: "actors",
      dir: "in",
      type: "ACTOR_REF",
      cardinality: "fan-in",
      label: "Actor",
    },
    actions: {
      name: "actions",
      dir: "in",
      type: "ACTION",
      cardinality: "fan-in",
      label: "Action",
    },
    resources: {
      name: "resources",
      dir: "in",
      type: "RESOURCE",
      cardinality: "fan-in",
      label: "Stock",
    },
    events: {
      name: "events",
      dir: "out",
      type: "EVENT",
      cardinality: "fan-out",
      label: "Events",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "State",
    },
  },
  configSchema: systemConfigSchema,
  fields: [{ key: "mechanic", label: "Mechanic", type: "string", default: "generic" }],
  runtime: "mechanical",
});

export const relationshipKind = defineNode({
  type: "systems.relationship",
  version: 1,
  metadata: { name: "Relationship", category: "Systems" },
  ports: {
    actors: {
      name: "actors",
      dir: "in",
      type: "ACTOR_REF",
      cardinality: "fan-in",
      label: "Actor",
    },
    relationship: {
      name: "relationship",
      dir: "out",
      type: "RELATIONSHIP",
      cardinality: "fan-out",
      label: "Stance",
    },
    events: {
      name: "events",
      dir: "out",
      type: "EVENT",
      cardinality: "fan-out",
      label: "Events",
    },
  },
  configSchema: relationshipConfigSchema,
  fields: [{ key: "stance", label: "Stance", type: "number", default: 50 }],
  runtime: "mechanical",
});

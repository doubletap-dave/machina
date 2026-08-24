import { defineNode } from "@machina/node-sdk";
import { baseConfigSchema, systemConfigSchema } from "./schemas.ts";

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
      label: "when time moves",
    },
    actors: {
      name: "actors",
      dir: "in",
      type: "ACTOR_REF",
      cardinality: "fan-in",
      label: "who is involved",
    },
    actions: {
      name: "actions",
      dir: "in",
      type: "ACTION",
      cardinality: "fan-in",
      label: "what they do",
    },
    resources: {
      name: "resources",
      dir: "in",
      type: "RESOURCE",
      cardinality: "fan-in",
      label: "what they have",
    },
    events: {
      name: "events",
      dir: "out",
      type: "EVENT",
      cardinality: "fan-out",
      label: "what happened",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "what changed",
    },
  },
  configSchema: systemConfigSchema,
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
      label: "who is involved",
    },
    relationship: {
      name: "relationship",
      dir: "out",
      type: "RELATIONSHIP",
      cardinality: "fan-out",
      label: "how they stand",
    },
    events: {
      name: "events",
      dir: "out",
      type: "EVENT",
      cardinality: "fan-out",
      label: "what happened",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

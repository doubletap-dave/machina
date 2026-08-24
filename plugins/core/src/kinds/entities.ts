import { defineNode } from "@machina/node-sdk";
import { actorConfigSchema, baseConfigSchema } from "./schemas.ts";

export const worldKind = defineNode({
  type: "entities.world",
  version: 1,
  metadata: { name: "World", category: "Entities" },
  ports: {
    tick: {
      name: "tick",
      dir: "in",
      type: "CLOCK",
      cardinality: "exclusive",
      label: "when time moves",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "what is true",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

export const actorKind = defineNode({
  type: "entities.actor",
  version: 1,
  metadata: { name: "Actor", category: "Entities" },
  ports: {
    tick: {
      name: "tick",
      dir: "in",
      type: "CLOCK",
      cardinality: "exclusive",
      label: "when time moves",
    },
    personality: {
      name: "personality",
      dir: "in",
      type: "PERSONALITY",
      cardinality: "exclusive",
      label: "how they think",
    },
    goals: {
      name: "goals",
      dir: "in",
      type: "GOAL",
      cardinality: "fan-in",
      label: "what they want",
    },
    memory: {
      name: "memory",
      dir: "in",
      type: "MEMORY",
      cardinality: "exclusive",
      label: "what they remember",
    },
    ref: {
      name: "ref",
      dir: "out",
      type: "ACTOR_REF",
      cardinality: "fan-out",
      label: "who they are",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "what is true about them",
    },
  },
  configSchema: actorConfigSchema,
  runtime: "actor",
});

export const resourceKind = defineNode({
  type: "entities.resource",
  version: 1,
  metadata: { name: "Resource", category: "Entities" },
  ports: {
    stock: {
      name: "stock",
      dir: "out",
      type: "RESOURCE",
      cardinality: "fan-out",
      label: "what they have",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

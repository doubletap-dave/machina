import { defineNode } from "@machina/node-sdk";
import {
  actorConfigSchema,
  resourceConfigSchema,
  worldConfigSchema,
} from "./schemas.ts";

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
      label: "Tick",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "State",
    },
  },
  configSchema: worldConfigSchema,
  fields: [{ key: "name", label: "Name", type: "string", default: "World" }],
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
      label: "Tick",
    },
    personality: {
      name: "personality",
      dir: "in",
      type: "PERSONALITY",
      cardinality: "exclusive",
      label: "Personality",
    },
    goals: {
      name: "goals",
      dir: "in",
      type: "GOAL",
      cardinality: "fan-in",
      label: "Goals",
    },
    memory: {
      name: "memory",
      dir: "in",
      type: "MEMORY",
      cardinality: "exclusive",
      label: "Memory",
    },
    ref: {
      name: "ref",
      dir: "out",
      type: "ACTOR_REF",
      cardinality: "fan-out",
      label: "Actor",
    },
    state: {
      name: "state",
      dir: "out",
      type: "WORLD_STATE",
      cardinality: "fan-out",
      label: "State",
    },
  },
  configSchema: actorConfigSchema,
  fields: [{ key: "name", label: "Name", type: "string" }],
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
      label: "Stock",
    },
  },
  configSchema: resourceConfigSchema,
  fields: [
    { key: "name", label: "Name", type: "string", default: "Resource" },
    { key: "amount", label: "Amount", type: "number", default: 0 },
  ],
  runtime: "mechanical",
});

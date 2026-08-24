import { defineNode } from "@machina/node-sdk";
import {
  agentConfigSchema,
  baseConfigSchema,
  personalityConfigSchema,
} from "./schemas.ts";

export const personalityKind = defineNode({
  type: "cognition.personality",
  version: 1,
  metadata: { name: "Personality", category: "Cognition" },
  ports: {
    traits: {
      name: "traits",
      dir: "out",
      type: "PERSONALITY",
      cardinality: "fan-out",
      label: "how they think",
    },
  },
  configSchema: personalityConfigSchema,
  runtime: "none",
});

export const goalKind = defineNode({
  type: "cognition.goal",
  version: 1,
  metadata: { name: "Goal", category: "Cognition" },
  ports: {
    goals: {
      name: "goals",
      dir: "out",
      type: "GOAL",
      cardinality: "fan-out",
      label: "what they want",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "none",
});

export const memoryKind = defineNode({
  type: "cognition.memory",
  version: 1,
  metadata: { name: "Memory", category: "Cognition" },
  ports: {
    events: {
      name: "events",
      dir: "in",
      type: "EVENT",
      cardinality: "fan-in",
      label: "what happened",
    },
    memory: {
      name: "memory",
      dir: "out",
      type: "MEMORY",
      cardinality: "fan-out",
      label: "what they remember",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "none",
});

export const agentKind = defineNode({
  type: "cognition.agent",
  version: 1,
  metadata: { name: "Agent", category: "Cognition" },
  ports: {
    observation: {
      name: "observation",
      dir: "in",
      type: "OBSERVATION",
      cardinality: "exclusive",
      label: "what they see",
    },
    memory: {
      name: "memory",
      dir: "in",
      type: "MEMORY",
      cardinality: "exclusive",
      label: "what they remember",
    },
    goals: {
      name: "goals",
      dir: "in",
      type: "GOAL",
      cardinality: "fan-in",
      label: "what they want",
    },
    personality: {
      name: "personality",
      dir: "in",
      type: "PERSONALITY",
      cardinality: "exclusive",
      label: "how they think",
    },
    action: {
      name: "action",
      dir: "out",
      type: "ACTION",
      cardinality: "fan-out",
      label: "what they do",
    },
    message: {
      name: "message",
      dir: "out",
      type: "MESSAGE",
      cardinality: "fan-out",
      label: "what they say",
    },
  },
  configSchema: agentConfigSchema,
  runtime: "agent",
});

import { defineNode } from "@machina/node-sdk";
import {
  agentConfigSchema,
  goalConfigSchema,
  memoryConfigSchema,
  personalityConfigSchema,
} from "./schemas.ts";

const traitField = (key: string, label: string) => ({
  key,
  label,
  type: "number" as const,
  default: 50,
});

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
      label: "Personality",
    },
  },
  configSchema: personalityConfigSchema,
  fields: [
    traitField("aggression", "Aggression"),
    traitField("paranoia", "Paranoia"),
    traitField("cooperation", "Cooperation"),
    traitField("risk", "Risk"),
  ],
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
      label: "Goals",
    },
  },
  configSchema: goalConfigSchema,
  fields: [
    { key: "statement", label: "Statement", type: "string", default: "New goal" },
    { key: "priority", label: "Priority", type: "number", default: 50 },
  ],
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
      label: "Events",
    },
    memory: {
      name: "memory",
      dir: "out",
      type: "MEMORY",
      cardinality: "fan-out",
      label: "Memory",
    },
  },
  configSchema: memoryConfigSchema,
  fields: [{ key: "seed", label: "Seed", type: "string", default: "" }],
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
      label: "Observation",
    },
    memory: {
      name: "memory",
      dir: "in",
      type: "MEMORY",
      cardinality: "exclusive",
      label: "Memory",
    },
    goals: {
      name: "goals",
      dir: "in",
      type: "GOAL",
      cardinality: "fan-in",
      label: "Goals",
    },
    personality: {
      name: "personality",
      dir: "in",
      type: "PERSONALITY",
      cardinality: "exclusive",
      label: "Personality",
    },
    action: {
      name: "action",
      dir: "out",
      type: "ACTION",
      cardinality: "fan-out",
      label: "Action",
    },
    message: {
      name: "message",
      dir: "out",
      type: "MESSAGE",
      cardinality: "fan-out",
      label: "Message",
    },
  },
  configSchema: agentConfigSchema,
  fields: [
    {
      key: "llmProvider",
      label: "Language model provider",
      type: "enum",
      options: ["anthropic", "openai", "openrouter", "perplexity"],
    },
    { key: "llmModel", label: "Language model", type: "string" },
  ],
  runtime: "agent",
});

import { defineNode } from "@machina/node-sdk";
import { baseConfigSchema } from "./schemas.ts";

export const perceptionKind = defineNode({
  type: "perception.perception",
  version: 1,
  metadata: { name: "Perception", category: "Perception" },
  ports: {
    state: {
      name: "state",
      dir: "in",
      type: "WORLD_STATE",
      cardinality: "exclusive",
      label: "what is true",
    },
    observation: {
      name: "observation",
      dir: "out",
      type: "OBSERVATION",
      cardinality: "fan-out",
      label: "what they see",
    },
  },
  configSchema: baseConfigSchema,
  runtime: "mechanical",
});

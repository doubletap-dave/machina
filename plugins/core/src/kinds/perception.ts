import { defineNode } from "@machina/node-sdk";
import { perceptionConfigSchema } from "./schemas.ts";

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
      label: "State",
    },
    observation: {
      name: "observation",
      dir: "out",
      type: "OBSERVATION",
      cardinality: "fan-out",
      label: "Observation",
    },
  },
  configSchema: perceptionConfigSchema,
  fields: [{ key: "fog", label: "Fog", type: "number", default: 50 }],
  runtime: "mechanical",
});

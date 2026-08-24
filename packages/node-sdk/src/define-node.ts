import type { PortDef } from "@machina/core";
import type { ZodType } from "zod";

export type NodeDefinition = {
  type: string;
  version: number;
  metadata: { name: string; category: string; icon?: string };
  ports: Record<string, PortDef>;
  configSchema: ZodType;
  runtime?: string;
};

export function defineNode(def: NodeDefinition): NodeDefinition {
  return {
    ...def,
    metadata: Object.freeze({ ...def.metadata }),
  };
}

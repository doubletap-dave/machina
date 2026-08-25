import type { KindField, PortDef } from "@machina/core";
import type { ZodType } from "zod";

export type NodeDefinition = {
  type: string;
  version: number;
  metadata: { name: string; category: string; icon?: string };
  ports: Record<string, PortDef>;
  configSchema: ZodType;
  runtime?: string;
  fields: KindField[];
};

export function defineNode(
  def: Omit<NodeDefinition, "fields"> & { fields?: KindField[] },
): NodeDefinition {
  return {
    ...def,
    metadata: Object.freeze({ ...def.metadata }),
    fields: Object.freeze([...(def.fields ?? [])]),
  };
}

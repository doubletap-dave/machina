import type { KindField, KindManifest } from "@machina/core";
import { z, type ZodTypeAny } from "zod";
import { defineNode, type NodeDefinition } from "./define-node.ts";

function withDefault(schema: ZodTypeAny, value: unknown): ZodTypeAny {
  if (value === undefined) return schema;
  return schema.default(value);
}

function fieldSchema(field: KindField): ZodTypeAny {
  switch (field.type) {
    case "string":
      return withDefault(z.string(), field.default);
    case "number":
      return withDefault(z.number(), field.default);
    case "boolean":
      return withDefault(z.boolean(), field.default);
    case "enum": {
      const options = field.options ?? [];
      if (options.length === 0) {
        return withDefault(z.string(), field.default);
      }
      return withDefault(z.enum(options as [string, ...string[]]), field.default);
    }
  }
}

export function kindManifestToDefinition(manifest: KindManifest): NodeDefinition {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of manifest.fields) {
    shape[field.key] = fieldSchema(field);
  }
  return defineNode({
    type: manifest.id,
    version: manifest.version,
    metadata: { name: manifest.name, category: manifest.category },
    ports: manifest.ports,
    configSchema: z.object(shape),
  });
}

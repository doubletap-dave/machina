import type { PortDef } from "./ports.ts";

export type KindFieldType = "string" | "number" | "boolean" | "enum";

export type KindField = {
  key: string;
  label: string;
  type: KindFieldType;
  default?: string | number | boolean;
  options?: string[];
};

export type KindManifest = {
  schemaVersion: 1;
  id: string;
  version: number;
  name: string;
  category: "Actors" | "World" | "Behavior" | "Systems" | "Output";
  cardColor: string;
  ports: Record<string, PortDef>;
  fields: KindField[];
};

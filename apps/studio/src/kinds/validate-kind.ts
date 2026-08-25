import {
  kindIdReservedCopy,
  type KindManifest,
  type PortType,
} from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";

export const KIND_ID_RE = /^custom\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CARD_COLOR_RE = /^#[0-9a-f]{6}$/;
export const FIELD_KEY_RE = /^[a-z][a-z0-9]*$/;

export const KIND_CATEGORIES = [
  "Actors",
  "World",
  "Behavior",
  "Systems",
  "Output",
] as const;

export const PORT_TYPES: PortType[] = [
  "ACTOR_REF",
  "WORLD_STATE",
  "OBSERVATION",
  "ACTION",
  "EVENT",
  "RESOURCE",
  "MESSAGE",
  "RELATIONSHIP",
  "MEMORY",
  "SIGNAL",
  "CLOCK",
  "PERSONALITY",
  "GOAL",
];

export function validateKind(
  manifest: KindManifest,
  registry: NodeRegistry,
  existingIds: string[] = [],
): string | null {
  const owned = new Set(existingIds);
  const reserved = new Set(
    registry.list().map((def) => def.type).filter((type) => !owned.has(type)),
  );
  if (!KIND_ID_RE.test(manifest.id) || reserved.has(manifest.id)) {
    return kindIdReservedCopy();
  }
  if (manifest.schemaVersion !== 1) {
    return "Schema version must be 1.";
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    return "Version must be an integer of 1 or more.";
  }
  if (!(KIND_CATEGORIES as readonly string[]).includes(manifest.category)) {
    return "Pick a library category.";
  }
  if (!CARD_COLOR_RE.test(manifest.cardColor)) {
    return "Card color must be a six-digit hex color.";
  }
  for (const field of manifest.fields) {
    if (!FIELD_KEY_RE.test(field.key)) {
      return "Field keys must start with a letter.";
    }
  }
  for (const port of Object.values(manifest.ports)) {
    if (!PORT_TYPES.includes(port.type)) {
      return "That port type is not allowed.";
    }
  }
  return null;
}

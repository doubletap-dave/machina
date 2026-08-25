export function paletteGroup(kind: string, category: string): string {
  if (kind === "entities.actor") return "Actors";
  const family = kind.split(".")[0];
  switch (family) {
    case "entities":
    case "control":
      return "World";
    case "cognition":
    case "perception":
      return "Behavior";
    case "systems":
      return "Systems";
    case "analysis":
      return "Output";
    default:
      return category;
  }
}

export const KIND_GROUP_ORDER = [
  "Actors",
  "World",
  "Behavior",
  "Systems",
  "Output",
] as const;

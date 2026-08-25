export function portMismatchCopy(sourceType: string, targetType: string): string {
  if (sourceType === "RESOURCE" && targetType === "PERSONALITY") {
    return "A resource can't shape a personality. Attach it to a nation or an economy.";
  }
  return "These ports don't speak the same language.";
}

export function unknownKindCopy(kind: string): string {
  return `Machina doesn't know a node called ${kind}.`;
}

export function versionMismatchCopy(): string {
  return "This node needs an update.";
}

export function missingClockCopy(): string {
  return "This world needs a Clock before it can run.";
}

export function operatorName(def: { metadata: { name: string } }): string {
  return def.metadata.name;
}

export {
  kindNoRuntimeCopy,
  kindPinMismatchCopy,
  kindUnpinnedFileCopy,
  kindPinMissingFileCopy,
  kindIdReservedCopy,
} from "@machina/core";

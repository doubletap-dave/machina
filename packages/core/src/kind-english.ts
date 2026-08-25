export function kindNoRuntimeCopy(name: string, id: string): string {
  return `${name} (${id}) has no simulation yet. Ship a plugin or remove it from the graph.`;
}

export function kindPinMismatchCopy(): string {
  return "This kind file does not match the pin. Restore the file or accept a new pin.";
}

export function kindUnpinnedFileCopy(): string {
  return "This folder has a kind file that is not pinned.";
}

export function kindPinMissingFileCopy(): string {
  return "This project pins a kind that is missing from the folder.";
}

export function kindIdReservedCopy(): string {
  return "That id is reserved by a built-in kind.";
}

export function actorNeedsNameCopy(): string {
  return "This actor needs a name.";
}

export function goalHasNoStatementCopy(): string {
  return "This goal has no statement.";
}

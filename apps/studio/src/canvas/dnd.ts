export const MACHINA_DND = "application/reactflow";

export function setDragKind(event: { dataTransfer: DataTransfer }, kind: string): void {
  event.dataTransfer.setData(MACHINA_DND, kind);
  event.dataTransfer.effectAllowed = "move";
}

export function kindFromDrop(event: { dataTransfer: DataTransfer }): string | null {
  const kind = event.dataTransfer.getData(MACHINA_DND);
  return kind.length > 0 ? kind : null;
}

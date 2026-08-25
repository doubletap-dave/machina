export type CanvasKeyAction = { kind: "delete" } | { kind: "undo" } | { kind: "redo" };

export type NodeStoreOp =
  | { op: "beginDrag"; id: string }
  | { op: "endDrag" }
  | { op: "position"; id: string; position: { x: number; y: number } }
  | { op: "select"; id: string; selected: boolean };

type SelectChange = { type: string; id?: string; selected?: boolean };
type RemoveChange = { type: string; id?: string };
type NodeChangeLike = {
  type: string;
  id?: string;
  dragging?: boolean;
  position?: { x: number; y: number };
  selected?: boolean;
};

export function isCanvasPaneTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(".react-flow, [data-machina-canvas]") !== null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable || target.contentEditable === "true") {
    return true;
  }
  return target.closest("[contenteditable='true'], [contenteditable='']") !== null;
}

export function canvasKeyAction(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}): CanvasKeyAction | null {
  if (isEditableTarget(event.target)) {
    return null;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    return isCanvasPaneTarget(event.target) ? { kind: "delete" } : null;
  }
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? { kind: "redo" } : { kind: "undo" };
  }
  if (key === "y") {
    return { kind: "redo" };
  }
  return null;
}

export function removedIds(changes: readonly RemoveChange[]): string[] {
  return changes.flatMap((change) => (change.type === "remove" && change.id ? [change.id] : []));
}

export function applySelectionChanges(
  selected: ReadonlySet<string>,
  changes: readonly SelectChange[],
): Set<string> {
  const next = new Set(selected);
  for (const change of changes) {
    if (change.type !== "select" || !change.id) {
      continue;
    }
    if (change.selected) {
      next.add(change.id);
    } else {
      next.delete(change.id);
    }
  }
  return next;
}

export function dispatchCanvasKeyAction(
  action: CanvasKeyAction,
  store: {
    undo(): void;
    redo(): void;
    deleteSelection(nodeIds: string[], edgeIds: string[]): void;
  },
  selection: { nodeIds: string[]; edgeIds: string[] },
): void {
  if (action.kind === "undo") {
    store.undo();
    return;
  }
  if (action.kind === "redo") {
    store.redo();
    return;
  }
  store.deleteSelection(selection.nodeIds, selection.edgeIds);
}

export function nodeChangeOps(changes: readonly NodeChangeLike[]): NodeStoreOp[] {
  const ops: NodeStoreOp[] = [];
  for (const change of changes) {
    if (change.type === "position" && change.id) {
      if (change.dragging === true) {
        ops.push({ op: "beginDrag", id: change.id });
      }
      if (change.position) {
        ops.push({ op: "position", id: change.id, position: change.position });
      }
      if (change.dragging === false) {
        ops.push({ op: "endDrag" });
      }
    }
    if (change.type === "select" && change.id && change.selected !== undefined) {
      ops.push({ op: "select", id: change.id, selected: change.selected });
    }
  }
  return ops;
}

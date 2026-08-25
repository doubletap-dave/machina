"use client";

const POSSESS_NEEDS_PAUSE = "Pause a run to possess this actor.";

export type CanvasContextMenuTarget =
  | { type: "node"; id: string; nodeKind: string }
  | { type: "edge"; id: string };

export type CanvasContextMenuStore = {
  deleteSelection(nodeIds: string[], edgeIds: string[]): void;
  duplicateNodes(ids: string[]): string[];
  deleteEdges(ids: string[]): void;
};

export type CanvasContextMenuProps = {
  target: CanvasContextMenuTarget | null;
  x: number;
  y: number;
  runPaused: boolean;
  store: CanvasContextMenuStore;
  onPossessNode: (id: string) => void;
  onMessage: (message: string) => void;
  onClose: () => void;
};

export function CanvasContextMenu({
  target,
  x,
  y,
  runPaused,
  store,
  onPossessNode,
  onMessage,
  onClose,
}: CanvasContextMenuProps) {
  if (!target) {
    return null;
  }

  function run(action: () => void): void {
    action();
    onClose();
  }

  const items: Array<{ label: string; onSelect: () => void }> =
    target.type === "edge"
      ? [
          {
            label: "Delete",
            onSelect: () => run(() => store.deleteEdges([target.id])),
          },
        ]
      : [
          {
            label: "Delete",
            onSelect: () => run(() => store.deleteSelection([target.id], [])),
          },
          {
            label: "Duplicate",
            onSelect: () => run(() => store.duplicateNodes([target.id])),
          },
          ...(target.nodeKind === "entities.actor"
            ? [
                {
                  label: "Possess",
                  onSelect: () =>
                    run(() => {
                      if (!runPaused) {
                        onMessage(POSSESS_NEEDS_PAUSE);
                        return;
                      }
                      onPossessNode(target.id);
                    }),
                },
              ]
            : []),
        ];

  return (
    <div
      role="menu"
      aria-label="Canvas context menu"
      className="fixed z-50 min-w-36 rounded border border-neutral-700 bg-neutral-900 py-1 shadow-xl"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="block w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-800"
          onClick={item.onSelect}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

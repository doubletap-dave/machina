import type { MachinaProject } from "@machina/core";

export type EditorSnapshot = {
  project: MachinaProject;
  currentGraphId: string;
  selectedNodeId: string | null;
};

const DEFAULT_LIMIT = 50;

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return structuredClone(snapshot);
}

export function createUndoStack(limit = DEFAULT_LIMIT) {
  const past: EditorSnapshot[] = [];
  const future: EditorSnapshot[] = [];

  return {
    push(snapshot: EditorSnapshot): void {
      past.push(cloneSnapshot(snapshot));
      future.length = 0;
      while (past.length > limit) {
        past.shift();
      }
    },

    undo(): EditorSnapshot | undefined {
      const snapshot = past.pop();
      if (!snapshot) {
        return undefined;
      }
      future.push(snapshot);
      return cloneSnapshot(snapshot);
    },

    redo(): EditorSnapshot | undefined {
      const snapshot = future.pop();
      if (!snapshot) {
        return undefined;
      }
      past.push(snapshot);
      return cloneSnapshot(snapshot);
    },

    clear(): void {
      past.length = 0;
      future.length = 0;
    },
  };
}

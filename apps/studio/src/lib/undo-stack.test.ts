import { describe, expect, it } from "vitest";
import { starterProject } from "../templates/starter.ts";
import { createUndoStack, type EditorSnapshot } from "./undo-stack.ts";

function snap(selectedNodeId: string | null): EditorSnapshot {
  const project = starterProject();
  return {
    project,
    currentGraphId: project.entryGraphId,
    selectedNodeId,
  };
}

describe("createUndoStack", () => {
  it("undo returns a clone of the last pushed snapshot", () => {
    const stack = createUndoStack();
    const pushed = snap("clock");
    stack.push(pushed);

    const restored = stack.undo();

    expect(restored?.selectedNodeId).toBe("clock");
    expect(restored?.currentGraphId).toBe(pushed.currentGraphId);
    expect(restored).not.toBe(pushed);
    expect(restored?.project).not.toBe(pushed.project);
  });

  it("redo restores the snapshot captured when undoing after a later push", () => {
    const stack = createUndoStack();
    stack.push(snap("clock"));
    stack.push(snap("world"));

    expect(stack.undo()?.selectedNodeId).toBe("world");
    expect(stack.redo()?.selectedNodeId).toBe("world");
  });

  it("push clears redo", () => {
    const stack = createUndoStack();
    stack.push(snap("clock"));
    stack.push(snap("world"));
    stack.undo();
    stack.push(snap("logger"));

    expect(stack.redo()).toBeUndefined();
    expect(stack.undo()?.selectedNodeId).toBe("logger");
  });

  it("clear drops undo and redo", () => {
    const stack = createUndoStack();
    stack.push(snap("clock"));
    stack.undo();
    stack.clear();

    expect(stack.undo()).toBeUndefined();
    expect(stack.redo()).toBeUndefined();
  });

  it("drops the oldest snapshot when over the limit", () => {
    const stack = createUndoStack(2);
    stack.push(snap("clock"));
    stack.push(snap("world"));
    stack.push(snap("logger"));

    expect(stack.undo()?.selectedNodeId).toBe("logger");
    expect(stack.undo()?.selectedNodeId).toBe("world");
    expect(stack.undo()).toBeUndefined();
  });
});

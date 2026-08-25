import { describe, expect, it } from "vitest";
import {
  applySelectionChanges,
  canvasKeyAction,
  dispatchCanvasKeyAction,
  nodeChangeOps,
  removedIds,
} from "./selection-delete.ts";

function keyEvent(partial: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
}) {
  return {
    key: partial.key,
    ctrlKey: partial.ctrlKey ?? false,
    metaKey: partial.metaKey ?? false,
    shiftKey: partial.shiftKey ?? false,
    target: partial.target ?? document.body,
  };
}

describe("canvasKeyAction", () => {
  it("maps Delete and Backspace to delete when not in a text field", () => {
    expect(canvasKeyAction(keyEvent({ key: "Delete" }))).toEqual({ kind: "delete" });
    expect(canvasKeyAction(keyEvent({ key: "Backspace" }))).toEqual({ kind: "delete" });
  });

  it("maps Ctrl/Meta+Z to undo and Shift+Z or Y to redo", () => {
    expect(canvasKeyAction(keyEvent({ key: "z", ctrlKey: true }))).toEqual({ kind: "undo" });
    expect(canvasKeyAction(keyEvent({ key: "z", metaKey: true }))).toEqual({ kind: "undo" });
    expect(canvasKeyAction(keyEvent({ key: "z", ctrlKey: true, shiftKey: true }))).toEqual({
      kind: "redo",
    });
    expect(canvasKeyAction(keyEvent({ key: "Z", metaKey: true, shiftKey: true }))).toEqual({
      kind: "redo",
    });
    expect(canvasKeyAction(keyEvent({ key: "y", ctrlKey: true }))).toEqual({ kind: "redo" });
    expect(canvasKeyAction(keyEvent({ key: "y", metaKey: true }))).toEqual({ kind: "redo" });
  });

  it("ignores shortcuts when the target is input, textarea, or contenteditable", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";

    expect(canvasKeyAction(keyEvent({ key: "Delete", target: input }))).toBeNull();
    expect(canvasKeyAction(keyEvent({ key: "z", ctrlKey: true, target: textarea }))).toBeNull();
    expect(canvasKeyAction(keyEvent({ key: "y", ctrlKey: true, target: editable }))).toBeNull();
  });
});

describe("dispatchCanvasKeyAction", () => {
  it("deletes selected nodes and edges, and routes undo/redo to the store", () => {
    const calls: string[] = [];
    const store = {
      undo: () => calls.push("undo"),
      redo: () => calls.push("redo"),
      deleteNodes: (ids: string[]) => calls.push(`nodes:${ids.join(",")}`),
      deleteEdges: (ids: string[]) => calls.push(`edges:${ids.join(",")}`),
    };

    dispatchCanvasKeyAction({ kind: "undo" }, store, { nodeIds: ["n"], edgeIds: ["e"] });
    dispatchCanvasKeyAction({ kind: "redo" }, store, { nodeIds: ["n"], edgeIds: ["e"] });
    dispatchCanvasKeyAction({ kind: "delete" }, store, { nodeIds: ["n1", "n2"], edgeIds: ["e1"] });

    expect(calls).toEqual(["undo", "redo", "nodes:n1,n2", "edges:e1"]);
  });
});

describe("removedIds", () => {
  it("collects ids from remove changes for store.deleteEdges", () => {
    expect(
      removedIds([
        { type: "select", id: "keep", selected: true },
        { type: "remove", id: "e1" },
        { type: "remove", id: "e2" },
      ]),
    ).toEqual(["e1", "e2"]);
  });
});

describe("applySelectionChanges", () => {
  it("adds and removes ids from select changes", () => {
    const selected = applySelectionChanges(new Set(["a"]), [
      { type: "select", id: "b", selected: true },
      { type: "select", id: "a", selected: false },
      { type: "remove", id: "x" },
    ]);

    expect([...selected]).toEqual(["b"]);
  });
});

describe("nodeChangeOps", () => {
  it("pairs beginDrag on first dragging true with position and endDrag on dragging false", () => {
    expect(
      nodeChangeOps([
        { type: "position", id: "n1", dragging: true, position: { x: 10, y: 20 } },
        { type: "position", id: "n1", dragging: true, position: { x: 11, y: 21 } },
        { type: "position", id: "n1", dragging: false, position: { x: 12, y: 22 } },
        { type: "select", id: "n1", selected: true },
      ]),
    ).toEqual([
      { op: "beginDrag", id: "n1" },
      { op: "position", id: "n1", position: { x: 10, y: 20 } },
      { op: "beginDrag", id: "n1" },
      { op: "position", id: "n1", position: { x: 11, y: 21 } },
      { op: "position", id: "n1", position: { x: 12, y: 22 } },
      { op: "endDrag" },
      { op: "select", id: "n1", selected: true },
    ]);
  });
});

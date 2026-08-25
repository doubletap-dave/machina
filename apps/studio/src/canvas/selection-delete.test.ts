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

function paneTarget(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "react-flow";
  const inner = document.createElement("div");
  pane.appendChild(inner);
  document.body.appendChild(pane);
  return inner;
}

describe("canvasKeyAction", () => {
  it("maps Delete and Backspace to delete when the target is inside the flow pane", () => {
    const inner = paneTarget();
    expect(canvasKeyAction(keyEvent({ key: "Delete", target: inner }))).toEqual({ kind: "delete" });
    expect(canvasKeyAction(keyEvent({ key: "Backspace", target: inner }))).toEqual({
      kind: "delete",
    });
  });

  it("does not delete when a Library or Inspector button is focused", () => {
    const button = document.createElement("button");
    button.textContent = "Personality";
    document.body.appendChild(button);

    expect(canvasKeyAction(keyEvent({ key: "Delete", target: button }))).toBeNull();
    expect(canvasKeyAction(keyEvent({ key: "Backspace", target: button }))).toBeNull();
    expect(canvasKeyAction(keyEvent({ key: "Delete", target: document.body }))).toBeNull();
  });

  it("maps Ctrl/Meta+Z to undo and Shift+Z or Y to redo", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    expect(canvasKeyAction(keyEvent({ key: "z", ctrlKey: true, target: button }))).toEqual({
      kind: "undo",
    });
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
  it("deletes mixed selection with one store method, and routes undo/redo", () => {
    const calls: string[] = [];
    const store = {
      undo: () => calls.push("undo"),
      redo: () => calls.push("redo"),
      deleteSelection: (nodeIds: string[], edgeIds: string[]) =>
        calls.push(`selection:${nodeIds.join(",")}|${edgeIds.join(",")}`),
    };

    dispatchCanvasKeyAction({ kind: "undo" }, store, { nodeIds: ["n"], edgeIds: ["e"] });
    dispatchCanvasKeyAction({ kind: "redo" }, store, { nodeIds: ["n"], edgeIds: ["e"] });
    dispatchCanvasKeyAction({ kind: "delete" }, store, { nodeIds: ["n1", "n2"], edgeIds: ["e1"] });

    expect(calls).toEqual(["undo", "redo", "selection:n1,n2|e1"]);
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

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasContextMenu } from "./CanvasContextMenu";

const POSSESS_NEEDS_PAUSE = "Pause a run to possess this actor.";

function mockStore() {
  return {
    deleteSelection: vi.fn(),
    duplicateNodes: vi.fn(() => ["copy-1"]),
    deleteEdges: vi.fn(),
  };
}

describe("CanvasContextMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("possess without a paused run reports the frozen English message", async () => {
    const user = userEvent.setup();
    const store = mockStore();
    const onPossessNode = vi.fn();
    const onMessage = vi.fn();

    render(
      <CanvasContextMenu
        target={{ type: "node", id: "actor-1", nodeKind: "entities.actor" }}
        x={12}
        y={24}
        runPaused={false}
        store={store}
        onPossessNode={onPossessNode}
        onMessage={onMessage}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("menuitem", { name: "Possess" }));

    expect(onMessage).toHaveBeenCalledWith(POSSESS_NEEDS_PAUSE);
    expect(onPossessNode).not.toHaveBeenCalled();
  });

  it("possess with a paused run calls onPossessNode", async () => {
    const user = userEvent.setup();
    const onPossessNode = vi.fn();
    const onMessage = vi.fn();

    render(
      <CanvasContextMenu
        target={{ type: "node", id: "actor-1", nodeKind: "entities.actor" }}
        x={0}
        y={0}
        runPaused={true}
        store={mockStore()}
        onPossessNode={onPossessNode}
        onMessage={onMessage}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("menuitem", { name: "Possess" }));

    expect(onPossessNode).toHaveBeenCalledWith("actor-1");
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("delete and duplicate invoke store mocks for a node", async () => {
    const user = userEvent.setup();
    const store = mockStore();

    const { rerender } = render(
      <CanvasContextMenu
        target={{ type: "node", id: "n1", nodeKind: "control.clock" }}
        x={0}
        y={0}
        runPaused={false}
        store={store}
        onPossessNode={() => {}}
        onMessage={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("menuitem", { name: "Possess" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(store.deleteSelection).toHaveBeenCalledWith(["n1"], []);

    rerender(
      <CanvasContextMenu
        target={{ type: "node", id: "n1", nodeKind: "control.clock" }}
        x={0}
        y={0}
        runPaused={false}
        store={store}
        onPossessNode={() => {}}
        onMessage={() => {}}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(store.duplicateNodes).toHaveBeenCalledWith(["n1"]);
  });

  it("edge menu deletes that edge and has no duplicate or possess", async () => {
    const user = userEvent.setup();
    const store = mockStore();

    render(
      <CanvasContextMenu
        target={{ type: "edge", id: "e1" }}
        x={0}
        y={0}
        runPaused={false}
        store={store}
        onPossessNode={() => {}}
        onMessage={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("menuitem", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Possess" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(store.deleteEdges).toHaveBeenCalledWith(["e1"]);
  });

  it("renders nothing for a pane with no target", () => {
    const { container } = render(
      <CanvasContextMenu
        target={null}
        x={0}
        y={0}
        runPaused={false}
        store={mockStore()}
        onPossessNode={() => {}}
        onMessage={() => {}}
        onClose={() => {}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("dismisses on Escape and document click-away, but not clicks on the menu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <>
        <button type="button">away</button>
        <CanvasContextMenu
          target={{ type: "edge", id: "e1" }}
          x={200}
          y={200}
          runPaused={false}
          store={mockStore()}
          onMessage={() => {}}
          onClose={onClose}
        />
      </>,
    );

    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await user.click(screen.getByRole("button", { name: "away" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("possess without onPossessNode reports the frozen English message even if paused", async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();

    render(
      <CanvasContextMenu
        target={{ type: "node", id: "actor-1", nodeKind: "entities.actor" }}
        x={0}
        y={0}
        runPaused={true}
        store={mockStore()}
        onMessage={onMessage}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole("menuitem", { name: "Possess" }));

    expect(onMessage).toHaveBeenCalledWith(POSSESS_NEEDS_PAUSE);
  });
});

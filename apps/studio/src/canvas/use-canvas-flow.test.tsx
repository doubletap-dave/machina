import { act, cleanup, renderHook } from "@testing-library/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ReactFlowProvider, type NodeChange } from "@xyflow/react";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { createProjectStore, type ProjectStore } from "@/lib/project-store.ts";
import type { NodeRegistry } from "@machina/node-sdk";
import { useCanvasFlow } from "./use-canvas-flow.ts";

beforeAll(() => {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

function testRegistry(): NodeRegistry {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

function wrapper({ children }: { children: ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

function useSubscribedCanvasFlow(store: ProjectStore, registry: NodeRegistry) {
  useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
  return useCanvasFlow({ store, registry, onEdgeError: () => {} });
}

describe("useCanvasFlow echo skip", () => {
  it("keeps an addNode after a deselect-only change", () => {
    const registry = testRegistry();
    const store = createProjectStore(registry);
    const { result } = renderHook(() => useSubscribedCanvasFlow(store, registry), { wrapper });

    const beforeIds = result.current.nodes.map((node) => node.id);
    expect(beforeIds).toContain("clock");

    act(() => {
      const deselect: NodeChange = { type: "select", id: "clock", selected: false };
      result.current.onNodesChange([deselect]);
    });

    let addedId = "";
    act(() => {
      addedId = store.addNode("cognition.personality", { x: 16, y: 16 }).id;
    });

    expect(store.getCurrentGraph().nodes.some((node) => node.id === addedId)).toBe(true);
    expect(result.current.nodes.map((node) => node.id)).toContain(addedId);
  });
});

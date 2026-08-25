"use client";

import { animationDelayMs, canvasBg } from "@machina/ui";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import type { MachinaNode } from "@machina/core";
import { useCanvasMenu } from "@/canvas/canvas-menu.ts";
import { ACTIVE_PORT_ATTR } from "@/canvas/connect-highlight.ts";
import { minimapMaskColor, minimapNodeFill } from "@/canvas/minimap.ts";
import { canvasKeyAction, dispatchCanvasKeyAction } from "@/canvas/selection-delete.ts";
import { useCanvasFlow } from "@/canvas/use-canvas-flow.ts";
import { useConnectHighlight } from "@/canvas/use-connect-highlight.ts";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { MachinaFlowNode } from "./MachinaFlowNode";

const nodeTypes: NodeTypes = { machina: MachinaFlowNode };

type CanvasProps = {
  onEdgeError: (message: string) => void;
  skipAnimations?: boolean;
  runPaused?: boolean;
  onPossessNode?: (id: string) => void;
};

function rootStyle(): CSSStyleDeclaration | undefined {
  return typeof document === "undefined" ? undefined : getComputedStyle(document.documentElement);
}

export function Canvas({
  onEdgeError,
  skipAnimations = false,
  runPaused = false,
  onPossessNode,
}: CanvasProps) {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();
  const currentGraphId = store.getCurrentGraphId();
  const nodesInitialized = useNodesInitialized();
  const reactFlow = useReactFlow();
  const fitViewRef = useRef(reactFlow.fitView);
  const fittedGraphIdRef = useRef<string | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);
  const flow = useCanvasFlow({ store, registry, onEdgeError });
  const connect = useConnectHighlight(registry, graph.nodes);
  const { menu, closeMenu, onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
    useCanvasMenu(graph.nodes);
  fitViewRef.current = reactFlow.fitView;
  selectedNodeIdsRef.current = flow.selectedNodeIds;
  selectedEdgeIdsRef.current = flow.selectedEdgeIds;

  useEffect(() => {
    if (!nodesInitialized || fittedGraphIdRef.current === currentGraphId) {
      return;
    }
    fittedGraphIdRef.current = currentGraphId;
    fitViewRef.current();
  }, [currentGraphId, nodesInitialized]);

  useEffect(() => {
    closeMenu();
  }, [closeMenu, currentGraphId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const action = canvasKeyAction(event);
      if (!action) {
        return;
      }
      event.preventDefault();
      dispatchCanvasKeyAction(action, store, {
        nodeIds: selectedNodeIdsRef.current,
        edgeIds: selectedEdgeIdsRef.current,
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  const onNodeClick = useCallback(() => closeMenu(), [closeMenu]);
  const onPaneClick = useCallback(() => {
    closeMenu();
    flow.clearSelection();
  }, [closeMenu, flow]);
  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      closeMenu();
      store.enterSubgraph(node.id);
    },
    [closeMenu, store],
  );

  return (
    <div
      ref={connect.canvasRef}
      className={skipAnimations ? "skip-animations h-full w-full" : "h-full w-full"}
      data-machina-canvas=""
      {...(connect.activePortType ? { [ACTIVE_PORT_ATTR]: connect.activePortType } : {})}
      style={{
        background: `var(--machina-canvas-bg, ${canvasBg})`,
        ["--machina-anim-ms" as string]: `${animationDelayMs(skipAnimations)}ms`,
      }}
    >
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        onNodesChange={flow.onNodesChange}
        onEdgesChange={flow.onEdgesChange}
        onConnect={flow.onConnect}
        onReconnect={flow.onReconnect}
        onConnectStart={connect.onConnectStart}
        onConnectEnd={connect.onConnectEnd}
        connectionLineStyle={connect.connectionLineStyle}
        isValidConnection={connect.isValidConnection}
        onDrop={flow.onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        connectionRadius={20}
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          color="var(--machina-grid-dot, #2a2a2a)"
        />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          width={200}
          height={120}
          style={{ width: 200, height: 120 }}
          nodeColor={() => minimapNodeFill(rootStyle())}
          maskColor={minimapMaskColor(rootStyle())}
          onNodeClick={flow.onMinimapNodeClick}
        />
      </ReactFlow>
      <CanvasContextMenu
        target={menu?.target ?? null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        runPaused={runPaused}
        store={store}
        onPossessNode={onPossessNode}
        onMessage={onEdgeError}
        onClose={closeMenu}
      />
    </div>
  );
}

export function CanvasProvider({
  onEdgeError,
  skipAnimations = false,
  runPaused = false,
  onPossessNode,
}: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas
        onEdgeError={onEdgeError}
        skipAnimations={skipAnimations}
        runPaused={runPaused}
        onPossessNode={onPossessNode}
      />
    </ReactFlowProvider>
  );
}

export function findNodeById(nodes: MachinaNode[], id: string | null): MachinaNode | undefined {
  if (!id) {
    return undefined;
  }
  return nodes.find((node) => node.id === id);
}

"use client";

import { animationDelayMs, canvasBg } from "@machina/ui";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { MachinaNode } from "@machina/core";
import { toFlowEdges, toFlowNodes } from "@/canvas/flow-elements.ts";
import { isValidMachinaConnection } from "@/canvas/is-valid-connection.ts";
import { minimapMaskColor, minimapNodeFill } from "@/canvas/minimap.ts";
import {
  applySelectionChanges,
  canvasKeyAction,
  dispatchCanvasKeyAction,
  nodeChangeOps,
  removedIds,
} from "@/canvas/selection-delete.ts";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import {
  CanvasContextMenu,
  type CanvasContextMenuTarget,
} from "./CanvasContextMenu";
import { MachinaFlowNode } from "./MachinaFlowNode";

const nodeTypes: NodeTypes = { machina: MachinaFlowNode };

type CanvasProps = {
  onEdgeError: (message: string) => void;
  skipAnimations?: boolean;
  runPaused?: boolean;
  onPossessNode?: (id: string) => void;
};

type OpenMenu = {
  target: CanvasContextMenuTarget;
  x: number;
  y: number;
};

function rootStyle(): CSSStyleDeclaration | undefined {
  return typeof document === "undefined" ? undefined : getComputedStyle(document.documentElement);
}

export function Canvas({
  onEdgeError,
  skipAnimations = false,
  runPaused = false,
  onPossessNode = () => {},
}: CanvasProps) {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();
  const currentGraphId = store.getCurrentGraphId();
  const nodesInitialized = useNodesInitialized();
  const reactFlow = useReactFlow();
  const fitViewRef = useRef(reactFlow.fitView);
  const fittedGraphIdRef = useRef<string | null>(null);
  const selectedNodeIdsRef = useRef(new Set<string>());
  const selectedEdgeIdsRef = useRef(new Set<string>());
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  fitViewRef.current = reactFlow.fitView;
  selectedNodeIdsRef.current = selectedNodeIds;
  selectedEdgeIdsRef.current = selectedEdgeIds;

  useEffect(() => {
    if (!nodesInitialized || fittedGraphIdRef.current === currentGraphId) {
      return;
    }
    fittedGraphIdRef.current = currentGraphId;
    fitViewRef.current();
  }, [currentGraphId, nodesInitialized]);

  useEffect(() => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    setMenu(null);
  }, [currentGraphId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const action = canvasKeyAction(event);
      if (!action) {
        return;
      }
      event.preventDefault();
      dispatchCanvasKeyAction(action, store, {
        nodeIds: [...selectedNodeIdsRef.current],
        edgeIds: [...selectedEdgeIdsRef.current],
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  const flowNodes: Node[] = useMemo(
    () => toFlowNodes(graph.nodes, registry, selectedNodeIds),
    [graph.nodes, registry, selectedNodeIds],
  );

  const flowEdges: Edge[] = useMemo(
    () => toFlowEdges(graph.edges, graph.nodes, registry, selectedEdgeIds),
    [graph.edges, graph.nodes, registry, selectedEdgeIds],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return;
      }
      const err = store.addEdge({
        sourceNode: connection.source,
        sourcePort: connection.sourceHandle,
        targetNode: connection.target,
        targetPort: connection.targetHandle,
      });
      if (err) {
        onEdgeError(err.message);
      }
    },
    [onEdgeError, store],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidMachinaConnection({
        registry,
        nodes: graph.nodes,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }),
    [graph.nodes, registry],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setMenu(null);
      store.selectNode(node.id);
    },
    [store],
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
    store.selectNode(null);
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
  }, [store]);

  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: Node) => {
      event.preventDefault();
      const machina = graph.nodes.find((candidate) => candidate.id === node.id);
      if (!machina) {
        return;
      }
      setMenu({
        target: { type: "node", id: node.id, nodeKind: machina.kind },
        x: event.clientX,
        y: event.clientY,
      });
    },
    [graph.nodes],
  );

  const onEdgeContextMenu = useCallback(
    (event: MouseEvent, edge: Edge) => {
      event.preventDefault();
      setMenu({
        target: { type: "edge", id: edge.id },
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const selectChanges: Array<{ type: string; id: string; selected: boolean }> = [];
      for (const op of nodeChangeOps(changes)) {
        if (op.op === "beginDrag") {
          store.beginDrag(op.id);
        } else if (op.op === "endDrag") {
          store.endDrag();
        } else if (op.op === "position") {
          store.setNodePosition(op.id, op.position);
        } else {
          selectChanges.push({ type: "select", id: op.id, selected: op.selected });
          if (op.selected) {
            store.selectNode(op.id);
          }
        }
      }
      if (selectChanges.length > 0) {
        setSelectedNodeIds((prev) => applySelectionChanges(prev, selectChanges));
      }
    },
    [store],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const ids = removedIds(changes);
      if (ids.length > 0) {
        store.deleteEdges(ids);
      }
      const selects = changes.filter((change) => change.type === "select");
      if (selects.length > 0) {
        setSelectedEdgeIds((prev) => applySelectionChanges(prev, selects));
      }
    },
    [store],
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      setMenu(null);
      store.enterSubgraph(node.id);
    },
    [store],
  );

  return (
    <div
      className={skipAnimations ? "skip-animations h-full w-full" : "h-full w-full"}
      data-machina-canvas=""
      style={{
        background: `var(--machina-canvas-bg, ${canvasBg})`,
        ["--machina-anim-ms" as string]: `${animationDelayMs(skipAnimations)}ms`,
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        connectionRadius={20}
        colorMode="dark"
      >
        <Background gap={16} color="#1a1a1a" />
        <Controls />
        <MiniMap
          nodeColor={() => minimapNodeFill(rootStyle())}
          maskColor={minimapMaskColor(rootStyle())}
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
        onClose={() => setMenu(null)}
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

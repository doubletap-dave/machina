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
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MachinaNode } from "@machina/core";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { MachinaFlowNode } from "./MachinaFlowNode";

const nodeTypes: NodeTypes = { machina: MachinaFlowNode };

type CanvasProps = {
  onEdgeError: (message: string) => void;
  skipAnimations?: boolean;
};

export function Canvas({ onEdgeError, skipAnimations = false }: CanvasProps) {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();
  const currentGraphId = store.getCurrentGraphId();
  const nodesInitialized = useNodesInitialized();
  const reactFlow = useReactFlow();
  const fitViewRef = useRef(reactFlow.fitView);
  const fittedGraphIdRef = useRef<string | null>(null);
  fitViewRef.current = reactFlow.fitView;

  useEffect(() => {
    if (!nodesInitialized || fittedGraphIdRef.current === currentGraphId) {
      return;
    }
    fittedGraphIdRef.current = currentGraphId;
    fitViewRef.current();
  }, [currentGraphId, nodesInitialized]);

  const flowNodes: Node[] = useMemo(
    () =>
      graph.nodes.map((node) => {
        const def = registry.getOrThrow(node.kind, node.version);
        const config = node.config as Record<string, string | undefined>;
        const label =
          node.kind === "entities.actor" && config.name
            ? String(config.name)
            : def.metadata.name;
        return {
          id: node.id,
          type: "machina",
          position: node.position,
          selected: store.getSelectedNodeId() === node.id,
          data: {
            label,
            ports: def.ports,
          },
        };
      }),
    [graph.nodes, registry, store],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNode,
        target: edge.targetNode,
        sourceHandle: edge.sourcePort,
        targetHandle: edge.targetPort,
      })),
    [graph.edges],
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

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      store.selectNode(node.id);
    },
    [store],
  );

  const onPaneClick = useCallback(() => {
    store.selectNode(null);
  }, [store]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position && change.id) {
          store.setNodePosition(change.id, change.position);
        }
      }
    },
    [store],
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      store.enterSubgraph(node.id);
    },
    [store],
  );

  return (
    <div
      className={skipAnimations ? "skip-animations h-full w-full" : "h-full w-full"}
      style={{
        background: canvasBg,
        ["--machina-anim-ms" as string]: `${animationDelayMs(skipAnimations)}ms`,
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        colorMode="dark"
      >
        <Background gap={16} color="#1a1a1a" />
        <Controls />
        <MiniMap nodeColor="#333" maskColor="rgb(12,12,12,0.8)" />
      </ReactFlow>
    </div>
  );
}

export function CanvasProvider({ onEdgeError, skipAnimations = false }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas onEdgeError={onEdgeError} skipAnimations={skipAnimations} />
    </ReactFlowProvider>
  );
}

export function findNodeById(nodes: MachinaNode[], id: string | null): MachinaNode | undefined {
  if (!id) {
    return undefined;
  }
  return nodes.find((node) => node.id === id);
}

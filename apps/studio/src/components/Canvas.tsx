"use client";

import { canvasBg } from "@machina/ui";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import type { MachinaNode } from "@machina/core";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { MachinaFlowNode } from "./MachinaFlowNode";

const nodeTypes: NodeTypes = { machina: MachinaFlowNode };

type CanvasProps = {
  onEdgeError: (message: string) => void;
};

export function Canvas({ onEdgeError }: CanvasProps) {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();

  const flowNodes: Node[] = useMemo(
    () =>
      graph.nodes.map((node) => {
        const def = registry.getOrThrow(node.kind, node.version);
        return {
          id: node.id,
          type: "machina",
          position: node.position,
          selected: store.getSelectedNodeId() === node.id,
          data: {
            label: def.metadata.name,
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

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      store.setNodePosition(node.id, node.position);
    },
    [store],
  );

  return (
    <div className="h-full w-full" style={{ background: canvasBg }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        colorMode="dark"
      >
        <Background gap={16} color="#1a1a1a" />
        <Controls />
        <MiniMap nodeColor="#333" maskColor="rgb(12,12,12,0.8)" />
      </ReactFlow>
    </div>
  );
}

export function CanvasProvider({ onEdgeError }: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas onEdgeError={onEdgeError} />
    </ReactFlowProvider>
  );
}

export function findNodeById(nodes: MachinaNode[], id: string | null): MachinaNode | undefined {
  if (!id) {
    return undefined;
  }
  return nodes.find((node) => node.id === id);
}

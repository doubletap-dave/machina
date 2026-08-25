import { useCallback, useEffect, useRef, type DragEvent } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type { NodeRegistry } from "@machina/node-sdk";
import type { ProjectStore } from "@/lib/project-store.ts";
import { kindFromDrop } from "./dnd.ts";
import { toFlowEdges, toFlowNodes } from "./flow-elements.ts";
import { graphFromFlow, snapPosition } from "./flow-sync.ts";
import { nodeChangeOps, removedIds } from "./selection-delete.ts";

type CanvasFlowOpts = {
  store: ProjectStore;
  registry: NodeRegistry;
  onEdgeError: (message: string) => void;
};

function selectedIds(items: { id: string; selected?: boolean }[]): string[] {
  return items.filter((item) => item.selected).map((item) => item.id);
}

export function useCanvasFlow({ store, registry, onEdgeError }: CanvasFlowOpts) {
  const graph = store.getCurrentGraph();
  const currentGraphId = store.getCurrentGraphId();
  const revision = store.getRevision();
  const reactFlow = useReactFlow();
  const echoRef = useRef(false);
  const graphIdRef = useRef(currentGraphId);

  const [nodes, setNodes] = useNodesState(toFlowNodes(graph.nodes, registry, new Set()));
  const [edges, setEdges] = useEdgesState(toFlowEdges(graph.edges, graph.nodes, registry, new Set()));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    if (echoRef.current) {
      echoRef.current = false;
      return;
    }
    const current = store.getCurrentGraph();
    const graphChanged = graphIdRef.current !== currentGraphId;
    graphIdRef.current = currentGraphId;
    const nodeSel = graphChanged ? new Set<string>() : new Set(selectedIds(nodesRef.current));
    const edgeSel = graphChanged ? new Set<string>() : new Set(selectedIds(edgesRef.current));
    setNodes(toFlowNodes(current.nodes, registry, nodeSel));
    setEdges(toFlowEdges(current.edges, current.nodes, registry, edgeSel));
  }, [currentGraphId, registry, revision, setEdges, setNodes, store]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const ops = nodeChangeOps(changes);
      const removed = removedIds(changes);
      const hasPosition = changes.some((change) => change.type === "position");
      if (hasPosition || removed.length > 0 || ops.some((op) => op.op === "select")) {
        echoRef.current = true;
      }
      for (const op of ops) {
        if (op.op === "beginDrag") {
          store.beginDrag(op.id);
        }
      }
      let nextNodes: typeof nodesRef.current | undefined;
      setNodes((current) => {
        nextNodes = applyNodeChanges(changes, current);
        return nextNodes;
      });
      if (hasPosition && nextNodes) {
        store.writeGraph(graphFromFlow(nextNodes, edgesRef.current, store.getCurrentGraph()));
      }
      for (const op of ops) {
        if (op.op === "endDrag") {
          store.endDrag();
        } else if (op.op === "select" && op.selected) {
          store.selectNode(op.id);
        }
      }
      if (removed.length > 0) {
        store.deleteNodes(removed);
      }
    },
    [setNodes, store],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const ids = removedIds(changes);
      if (ids.length > 0) {
        echoRef.current = true;
        store.deleteEdges(ids);
      }
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [setEdges, store],
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
        return;
      }
      echoRef.current = true;
      const created = store.getCurrentGraph().edges.at(-1);
      setEdges((current) => addEdge({ ...connection, id: created?.id }, current));
    },
    [onEdgeError, setEdges, store],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (
        !newConnection.source ||
        !newConnection.target ||
        !newConnection.sourceHandle ||
        !newConnection.targetHandle
      ) {
        return;
      }
      echoRef.current = true;
      let nextEdges: typeof edgesRef.current | undefined;
      setEdges((current) => {
        nextEdges = reconnectEdge(oldEdge, newConnection, current);
        return nextEdges;
      });
      if (nextEdges) {
        store.writeGraph(graphFromFlow(nodesRef.current, nextEdges, store.getCurrentGraph()));
      }
    },
    [setEdges, store],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = kindFromDrop(event);
      if (!kind) {
        return;
      }
      echoRef.current = true;
      const pos = snapPosition(
        reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
      store.addNode(kind, pos);
      const current = store.getCurrentGraph();
      setNodes(toFlowNodes(current.nodes, registry, new Set(selectedIds(nodesRef.current))));
      setEdges(toFlowEdges(current.edges, current.nodes, registry, new Set(selectedIds(edgesRef.current))));
    },
    [reactFlow, registry, setEdges, setNodes, store],
  );

  const clearSelection = useCallback(() => {
    echoRef.current = true;
    store.selectNode(null);
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)));
    setEdges((current) => current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)));
  }, [setEdges, setNodes, store]);

  const onMinimapNodeClick = useCallback(
    (_: unknown, node: { id: string }) => {
      echoRef.current = true;
      store.selectNode(node.id);
      setNodes((current) =>
        current.map((item) => ({ ...item, selected: item.id === node.id })),
      );
    },
    [setNodes, store],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    onDrop,
    clearSelection,
    onMinimapNodeClick,
    selectedNodeIds: selectedIds(nodes),
    selectedEdgeIds: selectedIds(edges),
  };
}

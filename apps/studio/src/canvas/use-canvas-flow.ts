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
import { shouldSkipEcho } from "./flow-echo.ts";
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
  const echoRevisionRef = useRef<number | null>(null);
  const graphIdRef = useRef(currentGraphId);

  const [nodes, setNodes] = useNodesState(toFlowNodes(graph.nodes, registry, new Set()));
  const [edges, setEdges] = useEdgesState(toFlowEdges(graph.edges, graph.nodes, registry, new Set()));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    if (shouldSkipEcho(revision, echoRevisionRef.current)) {
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
        echoRevisionRef.current = store.getRevision();
      }
      for (const op of ops) {
        if (op.op === "endDrag") {
          store.endDrag();
        } else if (op.op === "select" && op.selected) {
          store.selectNode(op.id);
          echoRevisionRef.current = store.getRevision();
        }
      }
      if (removed.length > 0) {
        store.deleteNodes(removed);
        echoRevisionRef.current = store.getRevision();
      }
    },
    [setNodes, store],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const ids = removedIds(changes);
      if (ids.length > 0) {
        store.deleteEdges(ids);
        echoRevisionRef.current = store.getRevision();
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
      echoRevisionRef.current = store.getRevision();
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
      let nextEdges: typeof edgesRef.current | undefined;
      setEdges((current) => {
        nextEdges = reconnectEdge(oldEdge, newConnection, current);
        return nextEdges;
      });
      if (nextEdges) {
        store.writeGraph(graphFromFlow(nodesRef.current, nextEdges, store.getCurrentGraph()));
        echoRevisionRef.current = store.getRevision();
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
      const pos = snapPosition(
        reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
      store.addNode(kind, pos);
      echoRevisionRef.current = store.getRevision();
      const current = store.getCurrentGraph();
      setNodes(toFlowNodes(current.nodes, registry, new Set(selectedIds(nodesRef.current))));
      setEdges(toFlowEdges(current.edges, current.nodes, registry, new Set(selectedIds(edgesRef.current))));
    },
    [reactFlow, registry, setEdges, setNodes, store],
  );

  const clearSelection = useCallback(() => {
    store.selectNode(null);
    echoRevisionRef.current = store.getRevision();
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)));
    setEdges((current) => current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)));
  }, [setEdges, setNodes, store]);

  const onMinimapNodeClick = useCallback(
    (_: unknown, node: { id: string }) => {
      store.selectNode(node.id);
      echoRevisionRef.current = store.getRevision();
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

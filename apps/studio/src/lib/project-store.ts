import {
  matchPorts,
  type GraphDocument,
  type MachinaEdge,
  type MachinaError,
  type MachinaNode,
  type MachinaProject,
} from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import type { Preset } from "@machina/plugin-core";
import { materializePreset } from "@/presets/materialize-preset.ts";
import { starterProject } from "@/templates/starter.ts";
import {
  deleteEdgesFromProject,
  deleteNodesFromProject,
  duplicateNodesInProject,
} from "./graph-edit.ts";
import { createUndoStack, type EditorSnapshot } from "./undo-stack.ts";

type Listener = () => void;

function emptyProject(): MachinaProject {
  return starterProject();
}

function defaultConfig(registry: NodeRegistry, kind: string, version: number): unknown {
  const def = registry.getOrThrow(kind, version);
  if (kind === "entities.actor") {
    return def.configSchema.parse({ name: "Actor" });
  }
  return def.configSchema.parse({});
}

export function createProjectStore(registry: NodeRegistry) {
  let project = emptyProject();
  let currentGraphId = project.entryGraphId;
  let selectedNodeId: string | null = null;
  let revision = 0;
  let dragging = false;
  const history = createUndoStack(50);
  const redos: EditorSnapshot[] = [];
  const listeners = new Set<Listener>();

  function emit(): void {
    revision += 1;
    for (const listener of listeners) {
      listener();
    }
  }

  function graphById(id: string): GraphDocument | undefined {
    return project.graphs.find((graph) => graph.id === id);
  }

  function currentGraph(): GraphDocument {
    const graph = graphById(currentGraphId);
    if (!graph) {
      throw new Error("Current graph is missing from the project.");
    }
    return graph;
  }

  function findNode(graph: GraphDocument, nodeId: string): MachinaNode | undefined {
    return graph.nodes.find((node) => node.id === nodeId);
  }

  function snapshot(): EditorSnapshot {
    return {
      project: structuredClone(project),
      currentGraphId,
      selectedNodeId,
    };
  }

  function applySnapshot(next: EditorSnapshot): void {
    project = structuredClone(next.project);
    currentGraphId = next.currentGraphId;
    selectedNodeId = next.selectedNodeId;
  }

  function record(): void {
    history.push(snapshot());
    redos.length = 0;
  }

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getRevision(): number {
      return revision;
    },

    getProject(): MachinaProject {
      return project;
    },

    replaceProject(next: MachinaProject): void {
      project = structuredClone(next);
      currentGraphId = project.entryGraphId;
      selectedNodeId = null;
      dragging = false;
      history.clear();
      redos.length = 0;
      emit();
    },

    insertPreset(preset: Preset, origin: { x: number; y: number }): MachinaNode[] {
      const { rootNodes, rootEdges, extraGraphs } = materializePreset(
        preset,
        currentGraphId,
        origin,
      );
      const graph = currentGraph();
      graph.nodes.push(...rootNodes);
      graph.edges.push(...rootEdges);
      project = {
        ...project,
        graphs: [...project.graphs, ...extraGraphs],
        presetRefs: project.presetRefs.includes(preset.id)
          ? project.presetRefs
          : [...project.presetRefs, preset.id],
      };
      emit();
      return rootNodes;
    },

    getCurrentGraphId(): string {
      return currentGraphId;
    },

    getCurrentGraph(): GraphDocument {
      return currentGraph();
    },

    addNode(kind: string, position: { x: number; y: number }): MachinaNode {
      const def = registry.getOrThrow(kind, 1);
      const node: MachinaNode = {
        id: crypto.randomUUID(),
        kind,
        version: def.version,
        position,
        config: defaultConfig(registry, kind, def.version),
      };

      if (kind === "entities.actor") {
        const subgraph: GraphDocument = {
          id: crypto.randomUUID(),
          parentGraphId: currentGraphId,
          parentNodeId: node.id,
          nodes: [],
          edges: [],
        };
        node.subgraphId = subgraph.id;
        project = { ...project, graphs: [...project.graphs, subgraph] };
      }

      const graph = currentGraph();
      graph.nodes.push(node);
      emit();
      return node;
    },

    addEdge(edge: Omit<MachinaEdge, "id">): MachinaError | null {
      const graph = currentGraph();
      const sourceNode = findNode(graph, edge.sourceNode);
      const targetNode = findNode(graph, edge.targetNode);
      if (!sourceNode || !targetNode) {
        return { code: "NODE_MISSING", message: "One of these nodes is missing." };
      }

      const sourceDef = registry.getOrThrow(sourceNode.kind, sourceNode.version);
      const targetDef = registry.getOrThrow(targetNode.kind, targetNode.version);
      const sourcePort = sourceDef.ports[edge.sourcePort];
      const targetPort = targetDef.ports[edge.targetPort];
      if (!sourcePort || !targetPort) {
        return { code: "PORT_MISSING", message: "One of these ports is missing." };
      }

      const err = matchPorts(sourcePort, targetPort);
      if (err) {
        return err;
      }

      graph.edges.push({ ...edge, id: crypto.randomUUID() });
      emit();
      return null;
    },

    selectGraph(id: string): void {
      if (!graphById(id)) {
        return;
      }
      currentGraphId = id;
      emit();
    },

    enterSubgraph(nodeId: string): void {
      const node = findNode(currentGraph(), nodeId);
      if (!node?.subgraphId) {
        return;
      }
      currentGraphId = node.subgraphId;
      emit();
    },

    exitSubgraph(): void {
      const graph = currentGraph();
      if (!graph.parentGraphId) {
        return;
      }
      currentGraphId = graph.parentGraphId;
      selectedNodeId = null;
      emit();
    },

    selectNode(nodeId: string | null): void {
      selectedNodeId = nodeId;
      emit();
    },

    getSelectedNodeId(): string | null {
      return selectedNodeId;
    },

    updateNodeConfig(nodeId: string, patch: Record<string, unknown>): void {
      const node = findNode(currentGraph(), nodeId);
      if (!node) {
        return;
      }
      record();
      node.config = { ...(node.config as Record<string, unknown>), ...patch };
      emit();
    },

    setNodePosition(nodeId: string, position: { x: number; y: number }): void {
      const graph = currentGraph();
      const node = findNode(graph, nodeId);
      if (!node) {
        return;
      }
      graph.nodes = graph.nodes.map((candidate) =>
        candidate.id === nodeId ? { ...candidate, position } : candidate,
      );
      emit();
    },

    deleteNodes(ids: string[]): void {
      const graph = currentGraph();
      const existing = ids.filter((id) => findNode(graph, id));
      if (existing.length === 0) {
        return;
      }
      record();
      const removed = deleteNodesFromProject(project, graph, existing);
      if (selectedNodeId && removed.includes(selectedNodeId)) {
        selectedNodeId = null;
      }
      if (!graphById(currentGraphId)) {
        currentGraphId = project.entryGraphId;
      }
      emit();
    },

    deleteEdges(ids: string[]): void {
      const idSet = new Set(ids);
      const exists = project.graphs.some((graph) =>
        graph.edges.some((edge) => idSet.has(edge.id)),
      );
      if (!exists) {
        return;
      }
      record();
      deleteEdgesFromProject(project, ids);
      emit();
    },

    duplicateNodes(ids: string[]): string[] {
      const graph = currentGraph();
      const existing = ids.filter((id) => findNode(graph, id));
      if (existing.length === 0) {
        return [];
      }
      record();
      const newIds = duplicateNodesInProject(project, graph, existing);
      selectedNodeId = newIds.at(-1) ?? selectedNodeId;
      emit();
      return newIds;
    },

    beginDrag(nodeId: string): void {
      if (dragging) {
        return;
      }
      if (!findNode(currentGraph(), nodeId)) {
        return;
      }
      dragging = true;
      record();
    },

    endDrag(): void {
      dragging = false;
    },

    undo(): void {
      const prev = history.undo();
      if (!prev) {
        return;
      }
      dragging = false;
      redos.push(snapshot());
      applySnapshot(prev);
      emit();
    },

    redo(): void {
      const next = redos.pop();
      if (!next) {
        return;
      }
      dragging = false;
      history.push(snapshot());
      applySnapshot(next);
      emit();
    },
  };
}

export type ProjectStore = ReturnType<typeof createProjectStore>;

import {
  kindHash,
  matchPorts,
  type GraphDocument,
  type KindManifest,
  type MachinaEdge,
  type MachinaError,
  type MachinaNode,
  type MachinaProject,
} from "@machina/core";
import { kindManifestToDefinition, type NodeRegistry } from "@machina/node-sdk";
import type { Preset } from "@machina/plugin-core";
import { validateKind } from "@/kinds/validate-kind.ts";
import { materializePreset } from "@/presets/materialize-preset.ts";
import { starterProject } from "@/templates/starter.ts";
import {
  deleteEdgesFromProject,
  deleteNodesFromProject,
  duplicateNodesInProject,
} from "./graph-edit.ts";
import { createUndoStack, type EditorSnapshot } from "./undo-stack.ts";

type KindPin = { id: string; version: number; hash: string };

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
  let kinds: KindManifest[] = [];
  let kindPins: KindPin[] = [];
  let authoringKind = false;
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

  function deleteSelection(nodeIds: string[], edgeIds: string[]): void {
    const graph = currentGraph();
    const existingNodes = nodeIds.filter((id) => findNode(graph, id));
    const edgeIdSet = new Set(edgeIds);
    const hasEdges = project.graphs.some((candidate) =>
      candidate.edges.some((edge) => edgeIdSet.has(edge.id)),
    );
    if (existingNodes.length === 0 && !hasEdges) {
      return;
    }
    record();
    if (existingNodes.length > 0) {
      const removed = deleteNodesFromProject(project, graph, existingNodes);
      if (selectedNodeId && removed.includes(selectedNodeId)) {
        selectedNodeId = null;
      }
      if (!graphById(currentGraphId)) {
        currentGraphId = project.entryGraphId;
      }
    }
    if (hasEdges) {
      deleteEdgesFromProject(project, edgeIds);
    }
    emit();
  }

  async function upsertKind(manifest: KindManifest): Promise<string | null> {
    const owned = kinds.map((kind) => kind.id);
    const err = validateKind(manifest, registry, owned);
    if (err) {
      return err;
    }
    const previous = kinds.find((kind) => kind.id === manifest.id);
    const stored = structuredClone(manifest);
    const hash = await kindHash(stored);
    registry.register(kindManifestToDefinition(stored));
    kinds = previous
      ? kinds.map((kind) => (kind.id === stored.id ? stored : kind))
      : [...kinds, stored];
    const pin: KindPin = { id: stored.id, version: stored.version, hash };
    const pinAt = kindPins.findIndex((item) => item.id === stored.id);
    if (pinAt >= 0) {
      kindPins[pinAt] = pin;
    } else {
      kindPins = [...kindPins, pin];
    }
    if (previous) {
      applyKindGraphUpdates(project, previous, stored);
    }
    emit();
    return null;
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
      kinds = [];
      kindPins = [];
      authoringKind = false;
      history.clear();
      redos.length = 0;
      emit();
    },

    insertPreset(preset: Preset, origin: { x: number; y: number }): MachinaNode[] {
      record();
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
      record();
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

      record();
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
      if (nodeId) {
        authoringKind = false;
      }
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
      deleteSelection(ids, []);
    },

    deleteEdges(ids: string[]): void {
      deleteSelection([], ids);
    },

    deleteSelection,

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

    getKinds(): KindManifest[] {
      return kinds;
    },

    getKindPins(): KindPin[] {
      return kindPins;
    },

    isAuthoringKind(): boolean {
      return authoringKind;
    },

    beginAuthorKind(): void {
      selectedNodeId = null;
      authoringKind = true;
      emit();
    },

    upsertKind,

    addKindFromManifest: upsertKind,

    updateKindPins(next: KindPin[]): void {
      kindPins = structuredClone(next);
      emit();
    },
  };
}

function findNodeInProject(project: MachinaProject, nodeId: string): MachinaNode | undefined {
  for (const graph of project.graphs) {
    const node = graph.nodes.find((candidate) => candidate.id === nodeId);
    if (node) {
      return node;
    }
  }
  return undefined;
}

function applyKindGraphUpdates(
  project: MachinaProject,
  previous: KindManifest,
  next: KindManifest,
): void {
  const removedPorts = Object.keys(previous.ports).filter((port) => !(port in next.ports));
  const fieldKeys = new Set(next.fields.map((field) => field.key));
  const def = kindManifestToDefinition(next);

  for (const graph of project.graphs) {
    if (removedPorts.length > 0) {
      graph.edges = graph.edges.filter((edge) => {
        const source = findNodeInProject(project, edge.sourceNode);
        const target = findNodeInProject(project, edge.targetNode);
        if (source?.kind === next.id && removedPorts.includes(edge.sourcePort)) {
          return false;
        }
        if (target?.kind === next.id && removedPorts.includes(edge.targetPort)) {
          return false;
        }
        return true;
      });
    }
    for (const node of graph.nodes) {
      if (node.kind !== next.id) {
        continue;
      }
      const prev = (node.config ?? {}) as Record<string, unknown>;
      const stripped = Object.fromEntries(
        Object.entries(prev).filter(([key]) => fieldKeys.has(key)),
      );
      node.config = def.configSchema.parse(stripped);
    }
  }
}

export type ProjectStore = ReturnType<typeof createProjectStore>;

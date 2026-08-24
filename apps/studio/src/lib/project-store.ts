import {
  matchPorts,
  type GraphDocument,
  type MachinaEdge,
  type MachinaError,
  type MachinaNode,
  type MachinaProject,
} from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";

type Listener = () => void;

function emptyProject(): MachinaProject {
  const entryGraphId = crypto.randomUUID();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: "Untitled",
    entryGraphId,
    graphs: [{ id: entryGraphId, nodes: [], edges: [] }],
    presetRefs: [],
  };
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
  const listeners = new Set<Listener>();

  function emit(): void {
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

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getProject(): MachinaProject {
      return project;
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
      emit();
    },
  };
}

export type ProjectStore = ReturnType<typeof createProjectStore>;

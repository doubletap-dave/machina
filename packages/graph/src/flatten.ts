import type {
  GraphDocument,
  MachinaEdge,
  MachinaNode,
  MachinaProject,
} from "@machina/core";

export type FlatGraph = {
  nodes: MachinaNode[];
  edges: MachinaEdge[];
  portalParent: Map<string, string>;
};

export function flattenFromEntry(project: MachinaProject): FlatGraph {
  const graphsById = new Map(project.graphs.map((g) => [g.id, g]));
  const entry = graphsById.get(project.entryGraphId);
  if (!entry) {
    return { nodes: [], edges: [], portalParent: new Map() };
  }
  return flattenGraph(entry, graphsById);
}

function flattenGraph(
  graph: GraphDocument,
  graphsById: Map<string, GraphDocument>,
): FlatGraph {
  const nodes: MachinaNode[] = [];
  const edges: MachinaEdge[] = [];
  const portalParent = new Map<string, string>();

  for (const node of graph.nodes) {
    nodes.push(node);
    if (graph.parentNodeId) {
      portalParent.set(node.id, graph.parentNodeId);
    }

    if (node.subgraphId) {
      const child = graphsById.get(node.subgraphId);
      if (child) {
        const nested = flattenGraph(child, graphsById);
        nodes.push(...nested.nodes);
        edges.push(...nested.edges);
        for (const [id, parent] of nested.portalParent) {
          portalParent.set(id, parent);
        }
        for (const cn of nested.nodes) {
          if (!portalParent.has(cn.id)) {
            portalParent.set(cn.id, node.id);
          }
        }
      }
    }
  }

  edges.push(...graph.edges);
  return { nodes, edges, portalParent };
}

export function findClockOnEntry(project: MachinaProject): MachinaNode | undefined {
  const entry = project.graphs.find((g) => g.id === project.entryGraphId);
  if (!entry) return undefined;
  return entry.nodes.find((n) => n.kind === "control.clock");
}

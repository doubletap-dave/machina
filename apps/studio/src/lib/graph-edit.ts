import type { GraphDocument, MachinaEdge, MachinaNode, MachinaProject } from "@machina/core";

export function deleteNodesFromProject(
  project: MachinaProject,
  graph: GraphDocument,
  ids: string[],
): string[] {
  const idSet = new Set(ids);
  const removed = graph.nodes.filter((node) => idSet.has(node.id));
  if (removed.length === 0) {
    return [];
  }

  const dropGraphs = descendantGraphIds(project, removed);
  graph.nodes = graph.nodes.filter((node) => !idSet.has(node.id));
  for (const candidate of project.graphs) {
    candidate.edges = candidate.edges.filter(
      (edge) => !idSet.has(edge.sourceNode) && !idSet.has(edge.targetNode),
    );
  }
  project.graphs = project.graphs.filter((candidate) => !dropGraphs.has(candidate.id));
  return removed.map((node) => node.id);
}

export function deleteEdgesFromProject(project: MachinaProject, ids: string[]): void {
  const idSet = new Set(ids);
  for (const graph of project.graphs) {
    graph.edges = graph.edges.filter((edge) => !idSet.has(edge.id));
  }
}

export function duplicateNodesInProject(
  project: MachinaProject,
  graph: GraphDocument,
  ids: string[],
): string[] {
  const selected = graph.nodes.filter((node) => ids.includes(node.id));
  if (selected.length === 0) {
    return [];
  }

  const nodeIdMap = new Map<string, string>();
  const graphIdMap = new Map<string, string>();
  const extraGraphs: GraphDocument[] = [];
  const copiedOldGraphIds = new Set<string>();

  const copies: MachinaNode[] = selected.map((node) => {
    const id = crypto.randomUUID();
    nodeIdMap.set(node.id, id);
    return {
      ...node,
      id,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      config: structuredClone(node.config),
      subgraphId: node.subgraphId ? assignId(graphIdMap, node.subgraphId) : undefined,
    };
  });

  for (const node of selected) {
    if (!node.subgraphId) {
      continue;
    }
    copyGraphTree(
      project,
      node.subgraphId,
      assignId(graphIdMap, node.subgraphId),
      graph.id,
      nodeIdMap.get(node.id)!,
      extraGraphs,
      graphIdMap,
      nodeIdMap,
      copiedOldGraphIds,
    );
  }

  const graphByNewId = new Map(extraGraphs.map((extra) => [extra.id, extra]));
  for (const src of project.graphs) {
    const dest = destinationGraph(src.id, graph.id, graph, graphIdMap, graphByNewId);
    if (!dest) {
      continue;
    }
    for (const edge of [...src.edges]) {
      if (!nodeIdMap.has(edge.sourceNode) || !nodeIdMap.has(edge.targetNode)) {
        continue;
      }
      dest.edges.push(remapEdge(edge, nodeIdMap));
    }
  }

  graph.nodes.push(...copies);
  project.graphs = [...project.graphs, ...extraGraphs];
  return copies.map((node) => node.id);
}

function destinationGraph(
  srcGraphId: string,
  currentGraphId: string,
  currentGraph: GraphDocument,
  graphIdMap: Map<string, string>,
  extraById: Map<string, GraphDocument>,
): GraphDocument | undefined {
  if (srcGraphId === currentGraphId) {
    return currentGraph;
  }
  const mapped = graphIdMap.get(srcGraphId);
  return mapped ? extraById.get(mapped) : undefined;
}

function remapEdge(edge: MachinaEdge, nodeIdMap: Map<string, string>): MachinaEdge {
  return {
    ...edge,
    id: crypto.randomUUID(),
    sourceNode: nodeIdMap.get(edge.sourceNode)!,
    targetNode: nodeIdMap.get(edge.targetNode)!,
  };
}

function descendantGraphIds(project: MachinaProject, nodes: MachinaNode[]): Set<string> {
  const ids = new Set<string>();
  const queue: string[] = [];
  for (const node of nodes) {
    if (node.subgraphId) {
      queue.push(node.subgraphId);
    }
  }
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (ids.has(id)) {
      continue;
    }
    ids.add(id);
    const graph = project.graphs.find((candidate) => candidate.id === id);
    if (graph) {
      for (const node of graph.nodes) {
        if (node.subgraphId) {
          queue.push(node.subgraphId);
        }
      }
    }
    for (const candidate of project.graphs) {
      if (candidate.parentGraphId === id) {
        queue.push(candidate.id);
      }
    }
  }
  return ids;
}

function assignId(map: Map<string, string>, oldId: string): string {
  const existing = map.get(oldId);
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  map.set(oldId, next);
  return next;
}

function copyGraphTree(
  project: MachinaProject,
  oldGraphId: string,
  newGraphId: string,
  newParentGraphId: string,
  newParentNodeId: string,
  extra: GraphDocument[],
  graphIdMap: Map<string, string>,
  nodeIdMap: Map<string, string>,
  copiedOldGraphIds: Set<string>,
): void {
  if (copiedOldGraphIds.has(oldGraphId)) {
    return;
  }
  const src = project.graphs.find((graph) => graph.id === oldGraphId);
  if (!src) {
    return;
  }
  copiedOldGraphIds.add(oldGraphId);

  const newNodes: MachinaNode[] = src.nodes.map((node) => {
    const id = crypto.randomUUID();
    nodeIdMap.set(node.id, id);
    return {
      ...node,
      id,
      config: structuredClone(node.config),
      subgraphId: node.subgraphId ? assignId(graphIdMap, node.subgraphId) : undefined,
    };
  });

  extra.push({
    id: newGraphId,
    parentGraphId: newParentGraphId,
    parentNodeId: newParentNodeId,
    nodes: newNodes,
    edges: [],
  });

  for (const node of src.nodes) {
    if (!node.subgraphId) {
      continue;
    }
    copyGraphTree(
      project,
      node.subgraphId,
      assignId(graphIdMap, node.subgraphId),
      newGraphId,
      nodeIdMap.get(node.id)!,
      extra,
      graphIdMap,
      nodeIdMap,
      copiedOldGraphIds,
    );
  }

  for (const child of project.graphs) {
    if (child.parentGraphId !== oldGraphId) {
      continue;
    }
    const mappedParentNode = child.parentNodeId
      ? (nodeIdMap.get(child.parentNodeId) ?? newParentNodeId)
      : newParentNodeId;
    copyGraphTree(
      project,
      child.id,
      assignId(graphIdMap, child.id),
      newGraphId,
      mappedParentNode,
      extra,
      graphIdMap,
      nodeIdMap,
      copiedOldGraphIds,
    );
  }
}

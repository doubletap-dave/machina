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
  graph.edges = graph.edges.filter(
    (edge) => !idSet.has(edge.sourceNode) && !idSet.has(edge.targetNode),
  );
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
      copiedOldGraphIds,
    );
  }

  const newEdges: MachinaEdge[] = graph.edges
    .filter((edge) => nodeIdMap.has(edge.sourceNode) && nodeIdMap.has(edge.targetNode))
    .map((edge) => ({
      ...edge,
      id: crypto.randomUUID(),
      sourceNode: nodeIdMap.get(edge.sourceNode)!,
      targetNode: nodeIdMap.get(edge.targetNode)!,
    }));

  graph.nodes.push(...copies);
  graph.edges.push(...newEdges);
  project.graphs = [...project.graphs, ...extraGraphs];
  return copies.map((node) => node.id);
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

  const innerNodeMap = new Map<string, string>();
  const newNodes: MachinaNode[] = src.nodes.map((node) => {
    const id = crypto.randomUUID();
    innerNodeMap.set(node.id, id);
    return {
      ...node,
      id,
      config: structuredClone(node.config),
      subgraphId: node.subgraphId ? assignId(graphIdMap, node.subgraphId) : undefined,
    };
  });

  const newEdges: MachinaEdge[] = src.edges
    .filter((edge) => innerNodeMap.has(edge.sourceNode) && innerNodeMap.has(edge.targetNode))
    .map((edge) => ({
      ...edge,
      id: crypto.randomUUID(),
      sourceNode: innerNodeMap.get(edge.sourceNode)!,
      targetNode: innerNodeMap.get(edge.targetNode)!,
    }));

  extra.push({
    id: newGraphId,
    parentGraphId: newParentGraphId,
    parentNodeId: newParentNodeId,
    nodes: newNodes,
    edges: newEdges,
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
      innerNodeMap.get(node.id)!,
      extra,
      graphIdMap,
      copiedOldGraphIds,
    );
  }

  for (const child of project.graphs) {
    if (child.parentGraphId !== oldGraphId) {
      continue;
    }
    const mappedParentNode = child.parentNodeId
      ? (innerNodeMap.get(child.parentNodeId) ?? newParentNodeId)
      : newParentNodeId;
    copyGraphTree(
      project,
      child.id,
      assignId(graphIdMap, child.id),
      newGraphId,
      mappedParentNode,
      extra,
      graphIdMap,
      copiedOldGraphIds,
    );
  }
}

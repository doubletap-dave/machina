import type { PortType } from "./ports.ts";

export type MachinaProject = {
  schemaVersion: 1;
  id: string;
  name: string;
  entryGraphId: string;
  graphs: GraphDocument[];
  presetRefs: string[];
};

export type GraphDocument = {
  id: string;
  parentGraphId?: string;
  parentNodeId?: string;
  nodes: MachinaNode[];
  edges: MachinaEdge[];
};

export type MachinaNode = {
  id: string;
  kind: string;
  version: number;
  position: { x: number; y: number };
  config: unknown;
  subgraphId?: string;
};

export type MachinaEdge = {
  id: string;
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
};

export type Wire = {
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
  portType: PortType;
};

export function stripPositions(project: MachinaProject): MachinaProject {
  return {
    ...project,
    graphs: project.graphs.map((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => ({
        ...node,
        position: { x: 0, y: 0 },
      })),
    })),
  };
}

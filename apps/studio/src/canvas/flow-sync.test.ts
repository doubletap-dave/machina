import { describe, expect, it } from "vitest";
import type { GraphDocument } from "@machina/core";
import type { Edge, Node } from "@xyflow/react";
import { graphFromFlow, snapPosition } from "./flow-sync.ts";

describe("snapPosition", () => {
  it("snaps { x: 20, y: 10 } to the 16px grid", () => {
    expect(snapPosition({ x: 20, y: 10 })).toEqual({ x: 16, y: 16 });
  });
});

describe("graphFromFlow", () => {
  it("roundtrips node ids and keeps kind version config subgraphId from previous", () => {
    const previous: GraphDocument = {
      id: "entry",
      parentGraphId: "world",
      parentNodeId: "actor-root",
      nodes: [
        {
          id: "actor-1",
          kind: "entities.actor",
          version: 1,
          position: { x: 0, y: 0 },
          config: { name: "Ada" },
          subgraphId: "sub-1",
        },
        {
          id: "clock",
          kind: "control.clock",
          version: 1,
          position: { x: 8, y: 8 },
          config: { period: "month" },
        },
      ],
      edges: [
        {
          id: "e1",
          sourceNode: "clock",
          sourcePort: "tick",
          targetNode: "actor-1",
          targetPort: "tick",
        },
      ],
    };

    const nodes: Node[] = [
      { id: "actor-1", position: { x: 32, y: 48 }, data: {} },
      { id: "clock", position: { x: 64, y: 80 }, data: {} },
    ];
    const edges: Edge[] = [
      {
        id: "e1",
        source: "clock",
        target: "actor-1",
        sourceHandle: "tick",
        targetHandle: "tick",
      },
    ];

    const next = graphFromFlow(nodes, edges, previous);

    expect(next.id).toBe("entry");
    expect(next.parentGraphId).toBe("world");
    expect(next.parentNodeId).toBe("actor-root");
    expect(next.nodes.map((node) => node.id)).toEqual(["actor-1", "clock"]);
    expect(next.nodes[0]).toEqual({
      id: "actor-1",
      kind: "entities.actor",
      version: 1,
      position: { x: 32, y: 48 },
      config: { name: "Ada" },
      subgraphId: "sub-1",
    });
    expect(next.nodes[1]).toMatchObject({
      id: "clock",
      kind: "control.clock",
      config: { period: "month" },
      position: { x: 64, y: 80 },
    });
    expect(next.edges).toEqual(previous.edges);
  });

  it("builds a new node from data.machina when the id is not in previous", () => {
    const previous: GraphDocument = { id: "g", nodes: [], edges: [] };
    const nodes: Node[] = [
      {
        id: "new-1",
        position: { x: 16, y: 32 },
        data: {
          machina: {
            id: "new-1",
            kind: "control.clock",
            version: 1,
            position: { x: 0, y: 0 },
            config: { period: "week" },
          },
        },
      },
    ];

    const next = graphFromFlow(nodes, [], previous);

    expect(next.nodes).toEqual([
      {
        id: "new-1",
        kind: "control.clock",
        version: 1,
        position: { x: 16, y: 32 },
        config: { period: "week" },
      },
    ]);
  });
});

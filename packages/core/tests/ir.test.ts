import { describe, expect, it } from "vitest";
import { stripPositions, type MachinaProject } from "../src/index.ts";

const project: MachinaProject = {
  schemaVersion: 1,
  id: "p1",
  name: "Test",
  entryGraphId: "g1",
  presetRefs: [],
  graphs: [
    {
      id: "g1",
      nodes: [
        {
          id: "clock",
          kind: "control.clock",
          version: 1,
          position: { x: 10, y: 20 },
          config: { tick: "month" },
        },
      ],
      edges: [],
    },
  ],
};

describe("stripPositions", () => {
  it("zeros layout so runtime never sees canvas coordinates", () => {
    const stripped = stripPositions(project);
    expect(stripped.graphs[0]?.nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(project.graphs[0]?.nodes[0]?.position).toEqual({ x: 10, y: 20 });
  });
});

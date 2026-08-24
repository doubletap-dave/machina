import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MachinaProject } from "@machina/core";
import { describe, expect, it } from "vitest";
import { loadProject, saveProject } from "../src/project-files.ts";

const fixture: MachinaProject = {
  schemaVersion: 1,
  id: "proj-1",
  name: "Parent Subgraph",
  entryGraphId: "g-parent",
  presetRefs: ["preset-a"],
  graphs: [
    {
      id: "g-parent",
      nodes: [
        {
          id: "clock",
          kind: "control.clock",
          version: 1,
          position: { x: 100, y: 200 },
          config: { period: "month" },
          subgraphId: "g-sub",
        },
        {
          id: "world",
          kind: "entities.world",
          version: 1,
          position: { x: 50, y: 50 },
          config: { name: "World" },
        },
      ],
      edges: [
        {
          id: "e1",
          sourceNode: "clock",
          sourcePort: "tick",
          targetNode: "world",
          targetPort: "tick",
        },
      ],
    },
    {
      id: "g-sub",
      parentGraphId: "g-parent",
      parentNodeId: "clock",
      nodes: [
        {
          id: "actor",
          kind: "entities.actor",
          version: 1,
          position: { x: 10, y: 20 },
          config: { name: "Alice" },
        },
      ],
      edges: [],
    },
  ],
};

describe("project folder round-trip", () => {
  it("save then load preserves ids, names, edges, configs, and positions", async () => {
    const dir = join(
      tmpdir(),
      `machina-test-${randomBytes(8).toString("hex")}`,
    );
    await saveProject(dir, fixture);
    const loaded = await loadProject(dir);
    await rm(dir, { recursive: true, force: true });

    expect(loaded.id).toBe(fixture.id);
    expect(loaded.name).toBe(fixture.name);
    expect(loaded.entryGraphId).toBe(fixture.entryGraphId);
    expect(loaded.presetRefs).toEqual(fixture.presetRefs);
    expect(loaded.graphs).toHaveLength(2);

    const parent = loaded.graphs.find((g) => g.id === "g-parent");
    const sub = loaded.graphs.find((g) => g.id === "g-sub");

    expect(parent?.edges).toEqual(fixture.graphs[0]?.edges);
    expect(parent?.nodes[0]?.config).toEqual(fixture.graphs[0]?.nodes[0]?.config);
    expect(parent?.nodes[0]?.position).toEqual({ x: 100, y: 200 });
    expect(sub?.parentGraphId).toBe("g-parent");
    expect(sub?.parentNodeId).toBe("clock");
    expect(sub?.nodes[0]?.config).toEqual({ name: "Alice" });
    expect(sub?.nodes[0]?.position).toEqual({ x: 10, y: 20 });
  });
});

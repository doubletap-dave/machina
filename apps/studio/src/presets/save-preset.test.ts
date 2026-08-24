import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MachinaProject } from "@machina/core";
import { nationPreset } from "@machina/plugin-core";
import { copyPresetToUserLibrary, graphFromSelection } from "./save-preset.ts";

const project: MachinaProject = {
  schemaVersion: 1,
  id: "p",
  name: "Preset save",
  entryGraphId: "g",
  presetRefs: [],
  graphs: [
    {
      id: "g",
      nodes: [
        {
          id: "r1",
          kind: "entities.resource",
          version: 1,
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: "r2",
          kind: "entities.resource",
          version: 1,
          position: { x: 0, y: 0 },
          config: {},
        },
      ],
      edges: [
        {
          id: "e1",
          sourceNode: "r1",
          sourcePort: "stock",
          targetNode: "r2",
          targetPort: "stock",
        },
      ],
    },
  ],
};

describe("save preset", () => {
  it("extracts connected selection", () => {
    const result = graphFromSelection(project, "g", ["r1", "r2"]);
    expect("graph" in result).toBe(true);
    if ("graph" in result) {
      expect(result.graph.nodes).toHaveLength(2);
      expect(result.graph.edges).toHaveLength(1);
    }
  });

  it("errors on empty selection", () => {
    const result = graphFromSelection(project, "g", []);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.message).toBe("Select something to save as a preset.");
    }
  });

  it("copies preset to user library path", async () => {
    const home = await mkdtemp(join(tmpdir(), "machina-home-"));
    const preset = nationPreset("Test Nation");
    const path = await copyPresetToUserLibrary(preset, home);
    const raw = await readFile(path, "utf8");
    expect(path).toContain(join(".machina", "presets", preset.id, "graph.json"));
    expect(JSON.parse(raw).nodes.length).toBeGreaterThan(0);
  });
});

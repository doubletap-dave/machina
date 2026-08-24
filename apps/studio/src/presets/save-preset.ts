import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GraphDocument, MachinaError, MachinaProject } from "@machina/core";
import type { Preset } from "@machina/plugin-core";

export function graphFromSelection(
  project: MachinaProject,
  graphId: string,
  nodeIds: string[],
): { graph: GraphDocument } | { error: MachinaError } {
  if (nodeIds.length === 0) {
    return {
      error: {
        code: "EMPTY_SELECTION",
        message: "Select something to save as a preset.",
      },
    };
  }

  const source = project.graphs.find((g) => g.id === graphId);
  if (!source) {
    return {
      error: { code: "GRAPH_NOT_FOUND", message: "Graph not found." },
    };
  }

  const idSet = new Set(nodeIds);
  const nodes = source.nodes.filter((n) => idSet.has(n.id));
  const edges = source.edges.filter(
    (e) => idSet.has(e.sourceNode) && idSet.has(e.targetNode),
  );

  return {
    graph: {
      id: `selection-${graphId}`,
      nodes,
      edges,
    },
  };
}

export async function copyPresetToUserLibrary(
  preset: Preset,
  homeDir: string,
): Promise<string> {
  const dir = join(homeDir, ".machina", "presets", preset.id);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "graph.json");
  const copy = { ...preset, builtin: false };
  await writeFile(path, JSON.stringify(copy.graph, null, 2), "utf8");
  return path;
}

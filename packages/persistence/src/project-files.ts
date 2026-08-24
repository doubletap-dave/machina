import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GraphDocument, MachinaProject } from "@machina/core";

export type ProjectMeta = {
  schemaVersion: 1;
  id: string;
  name: string;
  entryGraphId: string;
  presetRefs: string[];
};

export async function saveProject(
  dir: string,
  project: MachinaProject,
): Promise<void> {
  await mkdir(join(dir, "graphs"), { recursive: true });
  await mkdir(join(dir, "presets"), { recursive: true });
  await mkdir(join(dir, "assets"), { recursive: true });

  const meta: ProjectMeta = {
    schemaVersion: project.schemaVersion,
    id: project.id,
    name: project.name,
    entryGraphId: project.entryGraphId,
    presetRefs: project.presetRefs,
  };

  await writeFile(join(dir, "machina.json"), JSON.stringify(meta, null, 2));

  for (const graph of project.graphs) {
    await writeFile(
      join(dir, "graphs", `${graph.id}.json`),
      JSON.stringify(graph, null, 2),
    );
  }
}

export async function loadProject(dir: string): Promise<MachinaProject> {
  const metaRaw = await readFile(join(dir, "machina.json"), "utf-8");
  const meta = JSON.parse(metaRaw) as ProjectMeta;

  const graphDir = join(dir, "graphs");
  const files = await readdir(graphDir);
  const graphs: GraphDocument[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const raw = await readFile(join(graphDir, file), "utf-8");
    graphs.push(JSON.parse(raw) as GraphDocument);
  }

  return {
    ...meta,
    graphs,
  };
}

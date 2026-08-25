import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  kindHash,
  kindPinMismatchCopy,
  kindPinMissingFileCopy,
  kindUnpinnedFileCopy,
  machinaError,
  type GraphDocument,
  type KindManifest,
  type MachinaError,
  type MachinaProject,
} from "@machina/core";

export type ProjectMeta = {
  schemaVersion: 1;
  id: string;
  name: string;
  entryGraphId: string;
  presetRefs: string[];
  kindPins?: Array<{ id: string; version: number; hash: string }>;
};

export async function saveProject(
  dir: string,
  project: MachinaProject,
  kinds: KindManifest[] = [],
): Promise<void> {
  await mkdir(join(dir, "graphs"), { recursive: true });
  await mkdir(join(dir, "presets"), { recursive: true });
  await mkdir(join(dir, "assets"), { recursive: true });

  const kindPins: NonNullable<ProjectMeta["kindPins"]> = [];
  for (const kind of kinds) {
    kindPins.push({
      id: kind.id,
      version: kind.version,
      hash: await kindHash(kind),
    });
  }

  const meta: ProjectMeta = {
    schemaVersion: project.schemaVersion,
    id: project.id,
    name: project.name,
    entryGraphId: project.entryGraphId,
    presetRefs: project.presetRefs,
  };
  if (kindPins.length > 0) {
    meta.kindPins = kindPins;
  }

  await writeFile(join(dir, "machina.json"), JSON.stringify(meta, null, 2));

  for (const graph of project.graphs) {
    await writeFile(
      join(dir, "graphs", `${graph.id}.json`),
      JSON.stringify(graph, null, 2),
    );
  }

  if (kinds.length > 0 || kindPins.length > 0) {
    await mkdir(join(dir, "kinds"), { recursive: true });
    for (const kind of kinds) {
      await writeFile(
        join(dir, "kinds", `${kind.id}.json`),
        JSON.stringify(kind, null, 2),
      );
    }
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
    schemaVersion: meta.schemaVersion,
    id: meta.id,
    name: meta.name,
    entryGraphId: meta.entryGraphId,
    presetRefs: meta.presetRefs,
    graphs,
  };
}

export async function loadKindManifests(dir: string): Promise<KindManifest[]> {
  const files = await listKindJsonFiles(dir);
  const kinds: KindManifest[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, "kinds", file), "utf-8");
    kinds.push(JSON.parse(raw) as KindManifest);
  }
  return kinds;
}

export async function verifyProjectKinds(
  dir: string,
  pins: NonNullable<ProjectMeta["kindPins"]>,
): Promise<MachinaError[]> {
  const files = await listKindJsonFiles(dir);
  const pinnedIds = new Set(pins.map((pin) => pin.id));
  const errors: MachinaError[] = [];

  for (const file of files) {
    const id = file.slice(0, -".json".length);
    if (!pinnedIds.has(id)) {
      errors.push(machinaError("KIND_UNPINNED_FILE", kindUnpinnedFileCopy()));
    }
  }

  for (const pin of pins) {
    const filename = `${pin.id}.json`;
    if (!files.includes(filename)) {
      errors.push(
        machinaError("KIND_PIN_MISSING_FILE", kindPinMissingFileCopy()),
      );
      continue;
    }
    const raw = await readFile(join(dir, "kinds", filename), "utf-8");
    const manifest = JSON.parse(raw) as KindManifest;
    if ((await kindHash(manifest)) !== pin.hash) {
      errors.push(machinaError("KIND_PIN_MISMATCH", kindPinMismatchCopy()));
    }
  }

  return errors;
}

async function listKindJsonFiles(dir: string): Promise<string[]> {
  try {
    const files = await readdir(join(dir, "kinds"));
    return files.filter((file) => file.endsWith(".json"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

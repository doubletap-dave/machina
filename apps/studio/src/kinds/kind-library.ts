import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir as osHomedir } from "node:os";
import { join } from "node:path";
import { kindHash, type KindManifest } from "@machina/core";

export type KindLibraryOpts = {
  homedir?: string;
  overwrite?: boolean;
};

export function libraryDir(homedir?: string): string {
  return join(homedir ?? osHomedir(), ".machina", "kinds");
}

function kindFile(id: string, homedir?: string): string {
  return join(libraryDir(homedir), `${id}.json`);
}

export async function publishKind(
  manifest: KindManifest,
  opts?: KindLibraryOpts,
): Promise<"ok" | "confirm"> {
  const path = kindFile(manifest.id, opts?.homedir);
  try {
    await access(path);
    if (!opts?.overwrite) {
      return "confirm";
    }
  } catch {
    // missing
  }
  await mkdir(libraryDir(opts?.homedir), { recursive: true });
  await writeFile(path, JSON.stringify(manifest, null, 2), "utf8");
  return "ok";
}

export async function addFromLibrary(
  id: string,
  opts?: { homedir?: string },
): Promise<KindManifest> {
  const raw = await readFile(kindFile(id, opts?.homedir), "utf8");
  return JSON.parse(raw) as KindManifest;
}

export async function listLibraryKinds(opts?: {
  homedir?: string;
}): Promise<KindManifest[]> {
  let names: string[];
  try {
    names = await readdir(libraryDir(opts?.homedir));
  } catch {
    return [];
  }
  const kinds: KindManifest[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const raw = await readFile(join(libraryDir(opts?.homedir), name), "utf8");
    kinds.push(JSON.parse(raw) as KindManifest);
  }
  return kinds;
}

export async function libraryNewer(
  name: string,
  pinHash: string,
  libraryManifest: KindManifest,
): Promise<string | null> {
  const hash = await kindHash(libraryManifest);
  if (hash === pinHash) {
    return null;
  }
  return `A newer library copy of ${name} exists.`;
}

import { kindHash, type KindManifest } from "@machina/core";
import type { KindLibraryCallbacks } from "./KindAuthorForm";

export const browserKindLibrary: KindLibraryCallbacks = {
  async publishKind(manifest, opts) {
    const response = await fetch("/api/kind-library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest, overwrite: opts?.overwrite }),
    });
    const body = (await response.json()) as { status?: "ok" | "confirm" };
    return body.status === "confirm" ? "confirm" : "ok";
  },
  async addFromLibrary(id) {
    const response = await fetch(`/api/kind-library/${encodeURIComponent(id)}`);
    return (await response.json()) as KindManifest;
  },
  async listLibraryKinds() {
    const response = await fetch("/api/kind-library");
    return (await response.json()) as KindManifest[];
  },
  async libraryNewer(name, pinHash, libraryManifest) {
    const hash = await kindHash(libraryManifest);
    if (hash === pinHash) {
      return null;
    }
    return `A newer library copy of ${name} exists.`;
  },
};

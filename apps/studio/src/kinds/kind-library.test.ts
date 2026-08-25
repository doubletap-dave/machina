// @vitest-environment node
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kindHash, type KindManifest } from "@machina/core";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { createProjectStore } from "@/lib/project-store.ts";
import {
  addFromLibrary,
  libraryDir,
  libraryNewer,
  listLibraryKinds,
  publishKind,
} from "./kind-library.ts";

const radioDesk: KindManifest = {
  schemaVersion: 1,
  id: "custom.radio-desk",
  version: 1,
  name: "Radio desk",
  category: "Systems",
  cardColor: "#aabbcc",
  ports: {
    clock: {
      name: "clock",
      dir: "in",
      type: "CLOCK",
      cardinality: "exclusive",
      label: "Clock",
    },
  },
  fields: [{ key: "label", label: "Label", type: "string", default: "desk" }],
};

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "machina-kinds-"));
}

describe("kind library", () => {
  it("resolves ~/.machina/kinds under an injectable homedir", async () => {
    const home = await tempHome();
    expect(libraryDir(home)).toBe(join(home, ".machina", "kinds"));
  });

  it("publishes then add-from-library round-trips a pinned copy", async () => {
    const home = await tempHome();
    expect(await publishKind(radioDesk, { homedir: home })).toBe("ok");

    const onDisk = JSON.parse(
      await readFile(join(libraryDir(home), "custom.radio-desk.json"), "utf8"),
    ) as KindManifest;
    expect(onDisk.id).toBe("custom.radio-desk");

    const loaded = await addFromLibrary("custom.radio-desk", { homedir: home });
    expect(loaded).toEqual(radioDesk);

    const listed = await listLibraryKinds({ homedir: home });
    expect(listed).toEqual([radioDesk]);

    const registry = createRegistry();
    registerCoreKinds(registry);
    const store = createProjectStore(registry);
    expect(await store.addKindFromManifest(loaded)).toBeNull();
    const pin = store.getKindPins().find((item) => item.id === "custom.radio-desk");
    expect(pin).toEqual({
      id: "custom.radio-desk",
      version: 1,
      hash: await kindHash(loaded),
    });
  });

  it("returns confirm when the library file exists and overwrite is not set", async () => {
    const home = await tempHome();
    expect(await publishKind(radioDesk, { homedir: home })).toBe("ok");
    expect(await publishKind(radioDesk, { homedir: home })).toBe("confirm");
    const updated = { ...radioDesk, name: "Radio desk two" };
    expect(await publishKind(updated, { homedir: home, overwrite: true })).toBe("ok");
    const loaded = await addFromLibrary("custom.radio-desk", { homedir: home });
    expect(loaded.name).toBe("Radio desk two");
  });

  it("returns newer-library banner copy when hashes differ", async () => {
    const hash = await kindHash(radioDesk);
    expect(await libraryNewer("Radio desk", hash, radioDesk)).toBeNull();
    expect(await libraryNewer("Radio desk", "0".repeat(64), radioDesk)).toBe(
      "A newer library copy of Radio desk exists.",
    );
  });
});

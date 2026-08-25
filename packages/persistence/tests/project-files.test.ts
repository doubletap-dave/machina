import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  kindHash,
  kindPinMismatchCopy,
  kindPinMissingFileCopy,
  kindUnpinnedFileCopy,
  type KindManifest,
  type MachinaProject,
} from "@machina/core";
import { describe, expect, it } from "vitest";
import {
  loadKindManifests,
  loadProject,
  saveProject,
  verifyProjectKinds,
} from "../src/project-files.ts";

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

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = join(
    tmpdir(),
    `machina-test-${randomBytes(8).toString("hex")}`,
  );
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

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

describe("project kinds", () => {
  it("save/load round-trips one kind and pin without attaching kinds to the project", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture, [radioDesk]);
      const loaded = await loadProject(dir);
      const metaRaw = await readFile(join(dir, "machina.json"), "utf-8");
      const meta = JSON.parse(metaRaw) as {
        kindPins?: Array<{ id: string; version: number; hash: string }>;
      };
      const kindRaw = await readFile(
        join(dir, "kinds", "custom.radio-desk.json"),
        "utf-8",
      );

      expect(loaded).not.toHaveProperty("kinds");
      expect(loaded.id).toBe(fixture.id);
      expect(loaded.graphs).toHaveLength(2);
      expect(meta.kindPins).toEqual([
        {
          id: radioDesk.id,
          version: radioDesk.version,
          hash: await kindHash(radioDesk),
        },
      ]);
      expect(JSON.parse(kindRaw)).toEqual(radioDesk);
    });
  });

  it("loadKindManifests returns the saved kind", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture, [radioDesk]);
      expect(await loadKindManifests(dir)).toEqual([radioDesk]);
    });
  });

  it("verifyProjectKinds reports KIND_UNPINNED_FILE for an extra kinds file", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture, [radioDesk]);
      await writeFile(
        join(dir, "kinds", "custom.extra.json"),
        JSON.stringify({ ...radioDesk, id: "custom.extra" }),
      );
      const pins = [
        {
          id: radioDesk.id,
          version: radioDesk.version,
          hash: await kindHash(radioDesk),
        },
      ];

      const errors = await verifyProjectKinds(dir, pins);

      expect(errors).toEqual([
        { code: "KIND_UNPINNED_FILE", message: kindUnpinnedFileCopy() },
      ]);
    });
  });

  it("verifyProjectKinds reports KIND_PIN_MISMATCH for a wrong hash", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture, [radioDesk]);
      const pins = [
        {
          id: radioDesk.id,
          version: radioDesk.version,
          hash: "0".repeat(64),
        },
      ];

      const errors = await verifyProjectKinds(dir, pins);

      expect(errors).toEqual([
        { code: "KIND_PIN_MISMATCH", message: kindPinMismatchCopy() },
      ]);
    });
  });

  it("verifyProjectKinds reports KIND_PIN_MISSING_FILE for a pin without a file", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture);
      const pins = [
        {
          id: radioDesk.id,
          version: radioDesk.version,
          hash: await kindHash(radioDesk),
        },
      ];

      const errors = await verifyProjectKinds(dir, pins);

      expect(errors).toEqual([
        { code: "KIND_PIN_MISSING_FILE", message: kindPinMissingFileCopy() },
      ]);
    });
  });

  it("loadProject still loads an old folder without kindPins", async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, "graphs"), { recursive: true });
      await writeFile(
        join(dir, "machina.json"),
        JSON.stringify({
          schemaVersion: 1,
          id: "old-proj",
          name: "Old",
          entryGraphId: "g1",
          presetRefs: [],
        }),
      );
      await writeFile(
        join(dir, "graphs", "g1.json"),
        JSON.stringify({ id: "g1", nodes: [], edges: [] }),
      );

      const loaded = await loadProject(dir);

      expect(loaded.id).toBe("old-proj");
      expect(loaded.name).toBe("Old");
      expect(loaded.graphs).toEqual([{ id: "g1", nodes: [], edges: [] }]);
      expect(loaded).not.toHaveProperty("kindPins");
      expect(loaded).not.toHaveProperty("kinds");
    });
  });

  it("loadKindManifests returns empty when kinds/ is missing", async () => {
    await withTempDir(async (dir) => {
      await saveProject(dir, fixture);
      expect(await loadKindManifests(dir)).toEqual([]);
    });
  });
});

import { describe, expect, it } from "vitest";
import type { KindManifest } from "@machina/core";
import { createRegistry, kindManifestToDefinition } from "./index.ts";

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

describe("kindManifestToDefinition", () => {
  it("registers a definition that applies field defaults and omits runtime", () => {
    const def = kindManifestToDefinition(radioDesk);
    const registry = createRegistry();
    registry.register(def);

    const got = registry.getOrThrow("custom.radio-desk", 1);
    expect(got).toBe(def);
    expect(got.type).toBe("custom.radio-desk");
    expect(got.version).toBe(1);
    expect(got.metadata).toEqual({ name: "Radio desk", category: "Systems" });
    expect(got.ports).toEqual(radioDesk.ports);
    expect(got.fields).toEqual(radioDesk.fields);
    expect(got.configSchema.parse({})).toEqual({ label: "desk" });
    expect(got.runtime).toBeUndefined();
  });

  it("parses number, boolean, and enum fields", () => {
    const def = kindManifestToDefinition({
      ...radioDesk,
      fields: [
        { key: "count", label: "Count", type: "number", default: 3 },
        { key: "live", label: "Live", type: "boolean", default: true },
        { key: "band", label: "Band", type: "enum", options: ["am", "fm"], default: "fm" },
      ],
    });

    expect(def.configSchema.parse({})).toEqual({ count: 3, live: true, band: "fm" });
    expect(def.configSchema.parse({ count: 8, live: false, band: "am" })).toEqual({
      count: 8,
      live: false,
      band: "am",
    });
  });

  it("does not call z.enum with an empty options list", () => {
    const def = kindManifestToDefinition({
      ...radioDesk,
      fields: [{ key: "band", label: "Band", type: "enum" }],
    });

    expect(() => def.configSchema.parse({ band: "shortwave" })).not.toThrow();
    expect(def.configSchema.parse({ band: "shortwave" })).toEqual({ band: "shortwave" });
  });
});

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
    expect(got.configSchema.parse({})).toEqual({ label: "desk" });
    expect(got.runtime).toBeUndefined();
  });
});

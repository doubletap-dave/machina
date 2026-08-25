import { describe, expect, it } from "vitest";
import { canonicalKindJson, kindHash } from "./kind-hash.ts";
import type { KindManifest } from "./kind-manifest.ts";

const clockPort = {
  name: "clock",
  dir: "in" as const,
  type: "CLOCK" as const,
  cardinality: "exclusive" as const,
  label: "Clock",
};

function radioDesk(cardColor: string): KindManifest {
  return {
    schemaVersion: 1,
    id: "custom.radio-desk",
    version: 1,
    name: "Radio desk",
    category: "Systems",
    cardColor,
    ports: { clock: clockPort },
    fields: [{ key: "label", label: "Label", type: "string", default: "desk" }],
  };
}

describe("kind hash", () => {
  it("hashes two manifests the same when only key order differs", async () => {
    const insertionOrder = radioDesk("#aabbcc");
    const reordered: KindManifest = {
      cardColor: "#aabbcc",
      category: "Systems",
      fields: [{ type: "string", default: "desk", label: "Label", key: "label" }],
      id: "custom.radio-desk",
      name: "Radio desk",
      ports: {
        clock: {
          label: "Clock",
          cardinality: "exclusive",
          type: "CLOCK",
          dir: "in",
          name: "clock",
        },
      },
      schemaVersion: 1,
      version: 1,
    };

    expect(JSON.stringify(insertionOrder)).not.toBe(JSON.stringify(reordered));
    expect(canonicalKindJson(insertionOrder)).toBe(canonicalKindJson(reordered));
    expect(await kindHash(insertionOrder)).toBe(await kindHash(reordered));
  });

  it("hashes a different cardColor to a different digest", async () => {
    const red = radioDesk("#ff0000");
    const blue = radioDesk("#0000ff");
    const redHash = await kindHash(red);
    const blueHash = await kindHash(blue);

    expect(redHash).not.toBe(blueHash);
    expect(redHash).toMatch(/^[0-9a-f]{64}$/);
    expect(blueHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

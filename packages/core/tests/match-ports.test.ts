import { describe, expect, it } from "vitest";
import { matchPorts, type PortDef } from "../src/index.ts";

const outResource: PortDef = {
  name: "stock",
  dir: "out",
  type: "RESOURCE",
  cardinality: "fan-out",
  label: "what they have",
};
const inPersonality: PortDef = {
  name: "traits",
  dir: "in",
  type: "PERSONALITY",
  cardinality: "exclusive",
  label: "how they think",
};
const inResource: PortDef = {
  name: "stock",
  dir: "in",
  type: "RESOURCE",
  cardinality: "fan-in",
  label: "what they have",
};

describe("matchPorts", () => {
  it("refuses Resource → Personality with the operator sentence", () => {
    const err = matchPorts(outResource, inPersonality);
    expect(err?.code).toBe("PORT_TYPE_MISMATCH");
    expect(err?.message).toBe(
      "A resource can't shape a personality. Attach it to a nation or an economy.",
    );
  });

  it("refuses other mismatches with the generic sentence", () => {
    const err = matchPorts(
      { ...outResource, type: "MEMORY" },
      inPersonality,
    );
    expect(err?.message).toBe("These ports don't speak the same language.");
  });

  it("allows RESOURCE → RESOURCE", () => {
    expect(matchPorts(outResource, inResource)).toBeNull();
  });

  it("refuses out → out", () => {
    const err = matchPorts(outResource, { ...outResource, name: "other" });
    expect(err?.code).toBe("PORT_DIRECTION");
  });
});

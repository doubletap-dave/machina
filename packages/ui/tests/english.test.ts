import { describe, expect, it } from "vitest";
import { portMismatchCopy } from "../src/index.ts";

describe("portMismatchCopy", () => {
  it("returns resource-to-personality sentence", () => {
    expect(portMismatchCopy("RESOURCE", "PERSONALITY")).toBe(
      "A resource can't shape a personality. Attach it to a nation or an economy.",
    );
  });

  it("returns generic sentence for other mismatches", () => {
    expect(portMismatchCopy("MEMORY", "PERSONALITY")).toBe(
      "These ports don't speak the same language.",
    );
  });
});

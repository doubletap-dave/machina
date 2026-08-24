import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.ts";

function sequence(seed: number, length: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length }, () => rng.next());
}

describe("createRng", () => {
  it("produces identical sequences for the same seed", () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20));
  });

  it("produces different sequences for different seeds", () => {
    expect(sequence(42, 20)).not.toEqual(sequence(43, 20));
  });
});

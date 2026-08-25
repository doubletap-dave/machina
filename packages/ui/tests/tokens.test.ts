import { describe, expect, it } from "vitest";
import { font } from "../src/index.ts";
import * as tokens from "../src/tokens.ts";

describe("tokens", () => {
  it("uses IBM Plex Sans as the UI typeface", () => {
    expect(font).toContain("IBM Plex Sans");
  });

  it("uses IBM Plex Mono for numbers", () => {
    expect(tokens.fontMono).toContain("IBM Plex Mono");
  });

  it("animationDelayMs is 0 when skipping animations and 180 otherwise", () => {
    expect(tokens.animationDelayMs(true)).toBe(0);
    expect(tokens.animationDelayMs(false)).toBe(180);
  });
});

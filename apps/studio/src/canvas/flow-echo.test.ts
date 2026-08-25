import { describe, expect, it } from "vitest";
import { shouldSkipEcho } from "./flow-echo.ts";

describe("shouldSkipEcho", () => {
  it("skips only when the echo revision matches the current revision", () => {
    expect(shouldSkipEcho(3, 3)).toBe(true);
    expect(shouldSkipEcho(4, 3)).toBe(false);
    expect(shouldSkipEcho(3, 2)).toBe(false);
  });

  it("does not skip when no echo revision was recorded", () => {
    expect(shouldSkipEcho(1, null)).toBe(false);
  });
});

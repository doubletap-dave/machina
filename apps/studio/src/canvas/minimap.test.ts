import { describe, expect, it } from "vitest";
import { minimapMaskColor, minimapNodeFill } from "./minimap.ts";

describe("minimapNodeFill", () => {
  it("falls back to #8a8a8a when computed style is empty, not #333", () => {
    const fill = minimapNodeFill();

    expect(fill).toBe("#8a8a8a");
    expect(fill).not.toBe("#333");
    expect(minimapNodeFill({ getPropertyValue: () => "" })).toBe("#8a8a8a");
    expect(minimapNodeFill({ getPropertyValue: () => "   " })).toBe("#8a8a8a");
  });

  it("reads --machina-minimap-node when set", () => {
    expect(
      minimapNodeFill({
        getPropertyValue: (name) => (name === "--machina-minimap-node" ? " #c8c8c8 " : ""),
      }),
    ).toBe("#c8c8c8");
  });
});

describe("minimapMaskColor", () => {
  it("falls back to rgba(12,12,12,0.8) when computed style is empty", () => {
    expect(minimapMaskColor()).toBe("rgba(12,12,12,0.8)");
    expect(minimapMaskColor({ getPropertyValue: () => "" })).toBe("rgba(12,12,12,0.8)");
  });

  it("reads --machina-minimap-mask when set", () => {
    expect(
      minimapMaskColor({
        getPropertyValue: (name) => (name === "--machina-minimap-mask" ? "rgba(0,0,0,0.5)" : ""),
      }),
    ).toBe("rgba(0,0,0,0.5)");
  });
});

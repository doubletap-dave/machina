import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PortSymbolId } from "@machina/ui";
import { PortSymbol } from "./port-symbol";

afterEach(() => {
  cleanup();
});

const SYMBOLS: PortSymbolId[] = [
  "clock",
  "eye",
  "play",
  "burst",
  "envelope",
  "coin",
  "mask",
  "flag",
  "book",
  "link",
  "radio",
  "globe",
  "person",
];

describe("PortSymbol", () => {
  it("draws a distinct glyph for each of the 13 symbol ids", () => {
    const marks = SYMBOLS.map((id) => {
      const { container } = render(<PortSymbol id={id} />);
      const svg = container.querySelector(`[data-port-symbol="${id}"]`);
      expect(svg).toBeTruthy();
      expect(svg).toHaveAttribute("width", "10");
      expect(svg).toHaveAttribute("height", "10");
      return svg!.innerHTML;
    });

    expect(new Set(marks).size).toBe(13);
  });
});

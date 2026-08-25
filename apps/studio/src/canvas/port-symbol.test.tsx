import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PortSymbolId } from "@machina/ui";
import { PortSymbol } from "./port-symbol";

afterEach(() => {
  cleanup();
});

const SYMBOLS: readonly PortSymbolId[] = [
  "disk",
  "ring",
  "triangle",
  "plus",
  "chevron",
  "square",
  "hex",
  "diamond",
  "bar",
  "double-ring",
  "wedge",
  "square-ring",
  "notch",
];

describe("PortSymbol", () => {
  it("draws a distinct 10×10 geometric primitive for each symbol id", () => {
    const marks = SYMBOLS.map((id) => {
      const { container } = render(<PortSymbol id={id} />);
      const svg = container.querySelector(`[data-port-symbol="${id}"]`);
      expect(svg).toBeTruthy();
      expect(svg).toHaveAttribute("width", "10");
      expect(svg).toHaveAttribute("height", "10");
      expect(svg!.querySelector("circle, rect, polygon")).toBeTruthy();
      return svg!.innerHTML;
    });

    expect(new Set(marks).size).toBe(13);
  });

  it("draws a filled disk and a hollow ring", () => {
    const disk = render(<PortSymbol id="disk" />).container.querySelector(
      '[data-port-symbol="disk"]',
    );
    const ring = render(<PortSymbol id="ring" />).container.querySelector(
      '[data-port-symbol="ring"]',
    );

    expect(disk?.querySelector("circle")).toBeTruthy();
    expect(ring?.querySelector("circle")).toBeTruthy();
    expect(disk!.innerHTML).not.toBe(ring!.innerHTML);
  });

  it("paints glyphs with an explicit contrast color, not inherited text color", () => {
    const { container } = render(
      <div style={{ color: "#a3a3a3" }}>
        <PortSymbol id="square-ring" />
      </div>,
    );
    const svg = container.querySelector('[data-port-symbol="square-ring"]');

    expect(svg).toHaveStyle({ color: "#171717" });
    expect((svg as HTMLElement | SVGElement).style.color).not.toBe("rgb(163, 163, 163)");
  });
});

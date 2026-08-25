import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PortSymbolId } from "@machina/ui";
import { PortSymbol } from "./port-symbol";

afterEach(() => {
  cleanup();
});

const SYMBOLS = [
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
] as const;

describe("PortSymbol", () => {
  it("draws a distinct 10×10 geometric primitive for each symbol id", () => {
    const marks = SYMBOLS.map((id) => {
      const { container } = render(<PortSymbol id={id as PortSymbolId} />);
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
    const disk = render(<PortSymbol id={"disk" as PortSymbolId} />).container.querySelector(
      '[data-port-symbol="disk"]',
    );
    const ring = render(<PortSymbol id={"ring" as PortSymbolId} />).container.querySelector(
      '[data-port-symbol="ring"]',
    );

    expect(disk?.querySelector("circle")).toBeTruthy();
    expect(ring?.querySelector("circle")).toBeTruthy();
    expect(disk!.innerHTML).not.toBe(ring!.innerHTML);
  });
});

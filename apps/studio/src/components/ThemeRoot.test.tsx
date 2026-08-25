import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_CSS_VARS, type MachinaThemeId } from "@machina/ui";
import { ThemeRoot } from "./ThemeRoot.tsx";

const globalsCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"), "utf8");

const THEMES: MachinaThemeId[] = ["machina", "eve", "rpo", "trek", "wars"];

function themeBlock(theme: MachinaThemeId): string {
  const match = globalsCss.match(
    new RegExp(`html\\[data-machina-theme="${theme}"\\][^{]*\\{([^}]+)\\}`),
  );
  return match?.[1] ?? "";
}

afterEach(() => {
  cleanup();
});

describe("ThemeRoot", () => {
  it("sets data-machina-theme to trek and trek canvas bg is not empty", () => {
    const { container } = render(
      <ThemeRoot theme="trek">
        <span>chrome</span>
      </ThemeRoot>,
    );
    const root = container.querySelector("[data-machina-theme]");
    expect(root?.getAttribute("data-machina-theme")).toBe("trek");

    const canvasBg = getComputedStyle(root as HTMLElement).getPropertyValue("--machina-canvas-bg").trim();
    const cssCanvasBg = themeBlock("trek").match(/--machina-canvas-bg:\s*([^;]+)/)?.[1]?.trim() ?? "";
    expect(canvasBg || cssCanvasBg).not.toBe("");
  });
});

describe("theme CSS variables", () => {
  it("defines every required chrome variable on each theme", () => {
    for (const theme of THEMES) {
      const block = themeBlock(theme);
      expect(block, `missing html[data-machina-theme="${theme}"] block`).not.toBe("");
      for (const name of THEME_CSS_VARS) {
        expect(block, `${theme} missing ${name}`).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
      }
      expect(block).not.toMatch(/--machina-port-/);
    }
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEME_CSS_VARS, THEME_IDS, portLanguage } from "./index.ts";

const themesSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "themes.ts"), "utf8");

describe("theme switch does not recolor port language", () => {
  it("CLOCK stays #e4b84a for every theme id", () => {
    for (const theme of THEME_IDS) {
      expect(theme).toBeTypeOf("string");
      expect(portLanguage("CLOCK").color).toBe("#e4b84a");
    }
  });

  it("themes module does not import or overwrite PORT_LANGUAGE", () => {
    expect(themesSource).not.toMatch(/PORT_LANGUAGE/);
    expect(themesSource).not.toMatch(/portLanguage/);
    expect(themesSource).not.toMatch(/port-language/);
    expect(THEME_CSS_VARS.join(" ")).not.toMatch(/port/i);
  });
});

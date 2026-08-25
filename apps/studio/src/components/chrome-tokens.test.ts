import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CHROME_FILES = [
  "components/ConfigurationPage.tsx",
  "components/DescribePanel.tsx",
  "components/Inspector.tsx",
  "components/Library.tsx",
  "components/MachinaFlowNode.tsx",
  "components/ProviderPanel.tsx",
  "components/RunPanel.tsx",
  "components/StudioShell.tsx",
  "components/studio-chrome.tsx",
  "kinds/KindAuthorForm.tsx",
  "run/StanceBar.tsx",
] as const;

describe("studio chrome tokens", () => {
  it("does not paint spec chrome with Tailwind neutrals", () => {
    for (const file of CHROME_FILES) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, file).not.toMatch(/\bneutral-\d{3}\b/);
    }
  });

  it("does not nest a second w-56 or border-r on Library", () => {
    const source = readFileSync(join(ROOT, "components/Library.tsx"), "utf8");
    expect(source).not.toMatch(/\bw-56\b/);
    expect(source).not.toMatch(/\bborder-r\b/);
  });
});

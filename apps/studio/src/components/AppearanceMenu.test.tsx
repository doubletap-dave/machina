import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { missingFontCopy } from "@machina/ui";
import { resolveMonoFont } from "@/lib/studio-fonts";
import { loadStudioPrefs, type StudioPrefs } from "@/lib/studio-prefs";
import { AppearanceMenu } from "./AppearanceMenu.tsx";
import { ThemeRoot } from "./ThemeRoot.tsx";

afterEach(() => {
  cleanup();
  localStorage.removeItem("machina.studio.prefs");
});

const basePrefs = {
  schemaVersion: 1 as const,
  theme: "machina" as const,
  uiFont: "ibm-plex-sans",
  monoFont: "jetbrains-mono-nerd",
};

describe("AppearanceMenu", () => {
  it("saves fira-code when that mono font is selected", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [prefs, setPrefs] = useState<StudioPrefs>(basePrefs);
      const mono = resolveMonoFont(prefs.monoFont);
      return (
        <ThemeRoot theme={prefs.theme} monoFontFamily={mono.family}>
          <AppearanceMenu prefs={prefs} onChange={setPrefs} />
        </ThemeRoot>
      );
    }
    const { container } = render(<Harness />);

    await user.selectOptions(screen.getByLabelText("Mono font"), "fira-code");

    expect(loadStudioPrefs().monoFont).toBe("fira-code");
    const root = container.querySelector("[data-machina-theme]") as HTMLElement;
    expect(root.style.getPropertyValue("--machina-font-mono")).toContain("Fira Code");
  });

  it("shows frozen English when the stored mono font is unknown", () => {
    render(
      <AppearanceMenu
        prefs={{ ...basePrefs, monoFont: "not-installed-face" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(missingFontCopy())).toBeInTheDocument();
  });
});

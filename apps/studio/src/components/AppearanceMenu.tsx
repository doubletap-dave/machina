"use client";

import {
  MONO_FONT_IDS,
  MONO_FONT_LABELS,
  THEME_IDS,
  THEME_LABELS,
  UI_FONT_IDS,
  UI_FONT_LABELS,
  isMonoFontId,
  missingFontCopy,
} from "@machina/ui";
import { saveStudioPrefs, type StudioPrefs } from "@/lib/studio-prefs";
import { resolveMonoFont, resolveUiFont } from "@/lib/studio-fonts";

type AppearanceMenuProps = {
  prefs: StudioPrefs;
  onChange: (prefs: StudioPrefs) => void;
};

export function AppearanceMenu({ prefs, onChange }: AppearanceMenuProps) {
  const uiMissing = resolveUiFont(prefs.uiFont).missing;
  const monoMissing = resolveMonoFont(prefs.monoFont).missing;

  function commit(patch: Partial<StudioPrefs>) {
    const next: StudioPrefs = {
      schemaVersion: 1,
      theme: patch.theme ?? prefs.theme,
      uiFont: patch.uiFont ?? prefs.uiFont,
      monoFont: patch.monoFont ?? prefs.monoFont,
    };
    saveStudioPrefs(next);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2" htmlFor="machina-theme">
        Theme
        <select
          id="machina-theme"
          className="rounded border bg-transparent px-1 py-0.5"
          style={{ borderColor: "var(--machina-panel-border)", color: "var(--machina-text)" }}
          value={prefs.theme}
          onChange={(event) => commit({ theme: event.target.value as StudioPrefs["theme"] })}
        >
          {THEME_IDS.map((id) => (
            <option key={id} value={id}>
              {THEME_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2" htmlFor="machina-ui-font">
        UI font
        <select
          id="machina-ui-font"
          className="rounded border bg-transparent px-1 py-0.5"
          style={{ borderColor: "var(--machina-panel-border)", color: "var(--machina-text)" }}
          value={prefs.uiFont}
          onChange={(event) => commit({ uiFont: event.target.value })}
        >
          {UI_FONT_IDS.map((id) => (
            <option key={id} value={id}>
              {UI_FONT_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2" htmlFor="machina-mono-font">
        Mono font
        <select
          id="machina-mono-font"
          className="rounded border bg-transparent px-1 py-0.5"
          style={{ borderColor: "var(--machina-panel-border)", color: "var(--machina-text)" }}
          value={isMonoFontId(prefs.monoFont) ? prefs.monoFont : "ibm-plex-mono"}
          onChange={(event) => commit({ monoFont: event.target.value })}
        >
          {MONO_FONT_IDS.map((id) => (
            <option key={id} value={id}>
              {MONO_FONT_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      {uiMissing || monoMissing ? <span>{missingFontCopy()}</span> : null}
    </div>
  );
}

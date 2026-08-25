import {
  DEFAULT_MONO_FONT,
  DEFAULT_UI_FONT,
  isMachinaThemeId,
  isMonoFontId,
  isUiFontId,
  type MachinaThemeId,
} from "@machina/ui";

export const STUDIO_PREFS_KEY = "machina.studio.prefs";

export type StudioPrefs = {
  schemaVersion: 1;
  theme: MachinaThemeId;
  uiFont: string;
  monoFont: string;
};

const DEFAULTS: StudioPrefs = {
  schemaVersion: 1,
  theme: "machina",
  uiFont: DEFAULT_UI_FONT,
  monoFont: DEFAULT_MONO_FONT,
};

function readStorage(): string | null {
  try {
    return localStorage.getItem(STUDIO_PREFS_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): void {
  try {
    localStorage.setItem(STUDIO_PREFS_KEY, value);
  } catch {
    // Quota / private mode — prefs stay in-memory only.
  }
}

function coercePrefs(value: unknown): StudioPrefs {
  if (value === null || typeof value !== "object") {
    return { ...DEFAULTS };
  }
  const raw = value as Record<string, unknown>;
  return {
    schemaVersion: 1,
    theme: isMachinaThemeId(raw.theme) ? raw.theme : DEFAULTS.theme,
    uiFont: isUiFontId(raw.uiFont) ? raw.uiFont : DEFAULTS.uiFont,
    monoFont: isMonoFontId(raw.monoFont) ? raw.monoFont : DEFAULTS.monoFont,
  };
}

export function loadStudioPrefs(): StudioPrefs {
  const stored = readStorage();
  if (!stored) {
    return { ...DEFAULTS };
  }
  try {
    return coercePrefs(JSON.parse(stored) as unknown);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStudioPrefs(prefs: StudioPrefs): void {
  writeStorage(JSON.stringify(coercePrefs(prefs)));
}

export type UiFontId = "ibm-plex-sans";

export type MonoFontId =
  | "ibm-plex-mono"
  | "jetbrains-mono-nerd"
  | "cascadia"
  | "meslo"
  | "fira-code"
  | "victor-mono"
  | "bitstream-vera-mono"
  | "iosevka";

export const UI_FONT_IDS = ["ibm-plex-sans"] as const satisfies readonly UiFontId[];

export const MONO_FONT_IDS = [
  "ibm-plex-mono",
  "jetbrains-mono-nerd",
  "cascadia",
  "meslo",
  "fira-code",
  "victor-mono",
  "bitstream-vera-mono",
  "iosevka",
] as const satisfies readonly MonoFontId[];

export const UI_FONT_LABELS: Record<UiFontId, string> = {
  "ibm-plex-sans": "IBM Plex Sans",
};

export const MONO_FONT_LABELS: Record<MonoFontId, string> = {
  "ibm-plex-mono": "IBM Plex Mono",
  "jetbrains-mono-nerd": "JetBrains Mono Nerd",
  cascadia: "Cascadia Code",
  meslo: "Meslo",
  "fira-code": "Fira Code",
  "victor-mono": "Victor Mono",
  "bitstream-vera-mono": "Bitstream Vera Sans Mono",
  iosevka: "Iosevka",
};

export const DEFAULT_UI_FONT: UiFontId = "ibm-plex-sans";
export const DEFAULT_MONO_FONT: MonoFontId = "jetbrains-mono-nerd";

export function missingFontCopy(): string {
  return "This font isn't installed. Using IBM Plex instead.";
}

export function isUiFontId(value: unknown): value is UiFontId {
  return typeof value === "string" && (UI_FONT_IDS as readonly string[]).includes(value);
}

export function isMonoFontId(value: unknown): value is MonoFontId {
  return typeof value === "string" && (MONO_FONT_IDS as readonly string[]).includes(value);
}

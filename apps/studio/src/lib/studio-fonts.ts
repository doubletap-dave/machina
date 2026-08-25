import {
  font,
  fontMono,
  isMonoFontId,
  isUiFontId,
  type MonoFontId,
} from "@machina/ui";

const MONO_STACKS: Record<MonoFontId, string> = {
  "ibm-plex-mono": fontMono,
  "jetbrains-mono-nerd": '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace',
  cascadia: '"Cascadia Code", ui-monospace, monospace',
  meslo: '"Meslo LG", "MesloLGS NF", "MesloLGL Nerd Font", ui-monospace, monospace',
  "fira-code": '"Fira Code", ui-monospace, monospace',
  "victor-mono": '"Victor Mono", ui-monospace, monospace',
  "bitstream-vera-mono": '"DejaVu Mono", "Bitstream Vera Sans Mono", ui-monospace, monospace',
  iosevka: '"Iosevka", ui-monospace, monospace',
};

const SHIPPED_MONO = new Set<MonoFontId>([
  "ibm-plex-mono",
  "jetbrains-mono-nerd",
  "cascadia",
  "fira-code",
  "victor-mono",
  "bitstream-vera-mono",
  "iosevka",
]);

export function resolveUiFont(id: string): { family: string; missing: boolean } {
  if (isUiFontId(id)) {
    return { family: font, missing: false };
  }
  return { family: font, missing: true };
}

export function resolveMonoFont(id: string): { family: string; missing: boolean } {
  if (!isMonoFontId(id) || !SHIPPED_MONO.has(id)) {
    return { family: fontMono, missing: true };
  }
  return { family: MONO_STACKS[id], missing: false };
}

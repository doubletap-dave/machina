export type MachinaThemeId = "machina" | "eve" | "rpo" | "trek" | "wars";

export const THEME_IDS = ["machina", "eve", "rpo", "trek", "wars"] as const satisfies readonly MachinaThemeId[];

export const THEME_LABELS: Record<MachinaThemeId, string> = {
  machina: "Machina default",
  eve: "EVE",
  rpo: "Ready Player One",
  trek: "Star Trek",
  wars: "Star Wars",
};

export const THEME_CSS_VARS = [
  "--machina-canvas-bg",
  "--machina-panel-bg",
  "--machina-panel-border",
  "--machina-text",
  "--machina-text-muted",
  "--machina-accent",
  "--machina-node-fill",
  "--machina-node-stroke",
  "--machina-minimap-node",
  "--machina-minimap-mask",
] as const;

export const MACHINA_THEME_DEFAULTS: Record<(typeof THEME_CSS_VARS)[number], string> = {
  "--machina-canvas-bg": "#0c0c0c",
  "--machina-panel-bg": "#171717",
  "--machina-panel-border": "#262626",
  "--machina-text": "#c8c8c8",
  "--machina-text-muted": "#a3a3a3",
  "--machina-accent": "#c8c8c8",
  "--machina-node-fill": "#1a1a1a",
  "--machina-node-stroke": "#3a3a3a",
  "--machina-minimap-node": "#8a8a8a",
  "--machina-minimap-mask": "rgba(12,12,12,0.8)",
};

export function isMachinaThemeId(value: unknown): value is MachinaThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

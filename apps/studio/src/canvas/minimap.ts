type StyleReader = {
  getPropertyValue(property: string): string;
};

function cssVar(name: string, fallback: string, style?: StyleReader | null): string {
  const value = style?.getPropertyValue(name)?.trim();
  return value || fallback;
}

export function minimapNodeFill(style?: StyleReader | null): string {
  return cssVar("--machina-minimap-node", "#8a8a8a", style);
}

export function minimapMaskColor(style?: StyleReader | null): string {
  return cssVar("--machina-minimap-mask", "rgba(12,12,12,0.8)", style);
}

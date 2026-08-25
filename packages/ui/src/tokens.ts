export const canvasBg = "#0c0c0c";
export const accent = "#c8c8c8";
export const font = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
export const fontMono = '"IBM Plex Mono", ui-monospace, monospace';

export function animationDelayMs(skipAnimations: boolean): number {
  return skipAnimations ? 0 : 180;
}

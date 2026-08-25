"use client";

import { fontMono } from "@machina/ui";
import type { CSSProperties, ReactNode } from "react";

export type StudioMode = "build" | "run" | "analyze" | "configure";

export const MODE_LABEL: Record<StudioMode, string> = {
  build: "Build",
  run: "Run",
  analyze: "Analyze",
  configure: "Configure",
};

const panelChrome: CSSProperties = {
  background: "var(--machina-panel-bg)",
  borderColor: "var(--machina-panel-border)",
  color: "var(--machina-text)",
};

export function StudioHeader({
  brand,
  modes,
  stances,
}: {
  brand: ReactNode;
  modes: ReactNode;
  stances: ReactNode;
}) {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-4 border-b px-4"
      style={panelChrome}
    >
      <div className="flex items-center gap-3">{brand}</div>
      <nav className="flex gap-2 text-xs">{modes}</nav>
      <div className="ml-auto">{stances}</div>
    </header>
  );
}

export function StudioWorkspace({
  mode,
  describe,
  library,
  canvas,
  inspector,
  runPanel,
  configure,
}: {
  mode: StudioMode;
  describe: ReactNode;
  library: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  runPanel: ReactNode;
  configure: ReactNode;
}) {
  if (mode === "configure") {
    return configure;
  }

  return (
    <>
      {mode === "build" ? describe : null}
      <div className="flex min-h-0 flex-1">
        <div className="flex w-56 shrink-0 flex-col border-r" style={panelChrome}>
          {mode === "build" ? library : null}
        </div>
        <main className="relative min-w-0 flex-1">{canvas}</main>
        <aside className="flex w-72 shrink-0 flex-col border-l" style={panelChrome}>
          {mode === "build" ? inspector : runPanel}
        </aside>
      </div>
    </>
  );
}

export function StudioFooter({
  turn,
  events,
  cost,
  errors,
}: {
  turn: number;
  events: number;
  cost: number;
  errors: number;
}) {
  return (
    <footer
      className="flex h-12 shrink-0 items-center gap-6 border-t px-4 text-xs"
      style={{
        fontFamily: `var(--machina-font-mono, ${fontMono})`,
        borderColor: "var(--machina-panel-border)",
        background: "var(--machina-panel-bg)",
        color: "var(--machina-text-muted)",
      }}
    >
      <span>Turn {turn}</span>
      <span>Events {events}</span>
      <span>Cost ${cost}</span>
      <span>Errors {errors}</span>
    </footer>
  );
}

"use client";

import { accent, canvasBg, font } from "@machina/ui";
import { useCallback, useState } from "react";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { CanvasProvider } from "./Canvas";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { Inspector } from "./Inspector";
import { Library } from "./Library";

export function StudioShell() {
  const store = useProjectSnapshot();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const graph = store.getCurrentGraph();
  const inSubgraph = Boolean(graph.parentGraphId);

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  const addNodeAtCenter = useCallback(
    (kind: string) => {
      store.addNode(kind, { x: 120 + Math.random() * 80, y: 80 + Math.random() * 80 });
    },
    [store],
  );

  const showError = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ background: canvasBg, color: accent, fontFamily: font }}>
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Machina Studio</span>
          {inSubgraph ? (
            <button
              type="button"
              className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
              onClick={() => store.exitSubgraph()}
            >
              Back to parent graph
            </button>
          ) : null}
        </div>
        <nav className="flex gap-2 text-xs">
          <button type="button" className="rounded bg-neutral-200 px-3 py-1 font-medium text-black">
            BUILD
          </button>
          <button type="button" disabled className="rounded px-3 py-1 text-neutral-500">
            RUN
          </button>
          <button type="button" disabled className="rounded px-3 py-1 text-neutral-500">
            ANALYZE
          </button>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <Library onAddKind={addNodeAtCenter} />
        <main className="relative min-w-0 flex-1">
          <CanvasProvider onEdgeError={showError} />
        </main>
        <Inspector />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectKind={addNodeAtCenter}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

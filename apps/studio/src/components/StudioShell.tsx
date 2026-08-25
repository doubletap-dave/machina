"use client";

import { accent, canvasBg, font } from "@machina/ui";
import type { Preset } from "@machina/plugin-core";
import { useCallback, useState } from "react";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { getStudioClient } from "@/lib/machina-client";
import { starterProject } from "@/templates/starter";
import { CanvasProvider } from "./Canvas";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { DescribePanel } from "./DescribePanel";
import { Inspector } from "./Inspector";
import { Library } from "./Library";
import { RunPanel } from "./RunPanel";

type StudioMode = "build" | "run" | "analyze";

export function StudioShell() {
  const store = useProjectSnapshot();
  const [mode, setMode] = useState<StudioMode>("build");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const graph = store.getCurrentGraph();
  const inSubgraph = Boolean(graph.parentGraphId);
  const project = store.getProject();

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  const addNodeAtCenter = useCallback(
    (kind: string) => {
      store.addNode(kind, { x: 120 + Math.random() * 80, y: 80 + Math.random() * 80 });
    },
    [store],
  );

  const insertPresetAtCenter = useCallback(
    (preset: Preset) => {
      store.insertPreset(preset, { x: 120 + Math.random() * 80, y: 80 + Math.random() * 80 });
    },
    [store],
  );

  const showError = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadTemplate = useCallback(
    async (template: "starter" | "example") => {
      if (template === "starter") {
        store.replaceProject(starterProject());
        return;
      }
      try {
        const project = await getStudioClient().loadExampleWorld();
        store.replaceProject(project);
        showSuccess("Example world loaded.");
      } catch (error) {
        showError(error instanceof Error ? error.message : "Example load failed.");
      }
    },
    [showError, showSuccess, store],
  );

  const validateProject = useCallback(async () => {
    const result = await getStudioClient().compile(store.getProject());
    if (!result.ok) {
      showError(result.errors.map((error) => error.message).join(" "));
      return;
    }
    setToast("Project compiles.");
    window.setTimeout(() => setToast(null), 2500);
  }, [showError, store]);

  return (
    <div className="flex h-screen flex-col" style={{ background: canvasBg, color: accent, fontFamily: font }}>
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Machina Studio</span>
          <span className="text-xs text-neutral-500">{project.name}</span>
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
          {(["build", "run", "analyze"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                mode === tab
                  ? "rounded bg-neutral-200 px-3 py-1 font-medium text-black"
                  : "rounded px-3 py-1 text-neutral-400 hover:text-neutral-200"
              }
              onClick={() => setMode(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
          {mode === "build" ? (
            <button
              type="button"
              className="rounded border border-neutral-700 px-3 py-1 text-neutral-300 hover:bg-neutral-800"
              onClick={() => void validateProject()}
            >
              Validate
            </button>
          ) : null}
        </nav>
      </header>

      {mode === "build" ? <DescribePanel onError={showError} onSuccess={showSuccess} /> : null}

      <div className="flex min-h-0 flex-1">
        {mode === "build" ? (
          <>
            <Library
              onAddKind={addNodeAtCenter}
              onInsertPreset={insertPresetAtCenter}
              onLoadTemplate={loadTemplate}
            />
            <main className="relative min-w-0 flex-1">
              <CanvasProvider onEdgeError={showError} />
            </main>
            <Inspector />
          </>
        ) : mode === "run" ? (
          <>
            <main className="relative min-w-0 flex-1">
              <CanvasProvider onEdgeError={showError} />
            </main>
            <aside className="w-72 border-l border-neutral-800 bg-neutral-950">
              <RunPanel onError={showError} />
            </aside>
          </>
        ) : (
          <aside className="w-full border-l border-neutral-800 bg-neutral-950 p-4">
            <RunPanel onError={showError} />
          </aside>
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectKind={addNodeAtCenter}
      />

      {toast ? (
        <div
          className={`pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded px-4 py-2 text-sm shadow-lg ${
            toast.includes("compiles") ||
            toast.includes("materialized") ||
            toast.includes("loaded")
              ? "bg-emerald-900/90 text-emerald-100"
              : "bg-red-900/90 text-red-100"
          }`}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

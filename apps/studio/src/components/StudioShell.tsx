"use client";

import { accent, canvasBg, font, fontMono } from "@machina/ui";
import type { Preset } from "@machina/plugin-core";
import { useCallback, useState } from "react";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { loadStudioPrefs } from "@/lib/studio-prefs";
import { getStudioClient } from "@/lib/machina-client";
import { starterProject } from "@/templates/starter";
import { CanvasProvider } from "./Canvas";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { DescribePanel } from "./DescribePanel";
import { Inspector } from "./Inspector";
import { Library } from "./Library";
import { ConfigurationPage } from "./ConfigurationPage";
import { RunPanel } from "./RunPanel";
import { ThemeRoot } from "./ThemeRoot";

type StudioMode = "build" | "run" | "analyze" | "configure";

const MODE_LABEL: Record<StudioMode, string> = {
  build: "Build",
  run: "Run",
  analyze: "Analyze",
  configure: "Configure",
};

export function StudioShell() {
  const store = useProjectSnapshot();
  const [prefs] = useState(() => loadStudioPrefs());
  const [mode, setMode] = useState<StudioMode>("build");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [runPaused, setRunPaused] = useState(false);
  const [possessRequest, setPossessRequest] = useState<string | null>(null);
  const turn = 0;
  const events = 0;
  const cost = 0;
  const errors = 0;
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
    const result = await getStudioClient().compile(
      store.getProject(),
      store.getKinds(),
    );
    if (!result.ok) {
      showError(result.errors.map((error) => error.message).join(" "));
      return;
    }
    setToast("Project compiles.");
    window.setTimeout(() => setToast(null), 2500);
  }, [showError, store]);

  return (
    <ThemeRoot
      theme={prefs.theme}
      className="flex h-screen flex-col"
      style={{
        background: `var(--machina-canvas-bg, ${canvasBg})`,
        color: `var(--machina-text, ${accent})`,
        fontFamily: `var(--machina-font-ui, ${font})`,
      }}
    >
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
          {(["build", "run", "analyze", "configure"] as const).map((tab) => (
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
              {MODE_LABEL[tab]}
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

      {mode === "configure" ? (
        <ConfigurationPage />
      ) : (
        <>
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
                  <CanvasProvider
                    onEdgeError={showError}
                    skipAnimations={skipAnimations}
                    runPaused={runPaused}
                    onPossessNode={setPossessRequest}
                  />
                </main>
                <Inspector />
              </>
            ) : mode === "run" ? (
              <main className="relative min-w-0 flex-1">
                <CanvasProvider
                  onEdgeError={showError}
                  skipAnimations={skipAnimations}
                  runPaused={runPaused}
                  onPossessNode={setPossessRequest}
                />
              </main>
            ) : null}

            <aside
              className={
                mode === "build"
                  ? "hidden"
                  : mode === "analyze"
                    ? "w-full border-l border-neutral-800 bg-neutral-950 p-4"
                    : "w-72 border-l border-neutral-800 bg-neutral-950"
              }
            >
              <RunPanel
                onError={showError}
                onPausedChange={setRunPaused}
                possessRequest={possessRequest}
                onPossessConsumed={() => setPossessRequest(null)}
              />
            </aside>
          </div>
        </>
      )}

      <footer
        className="flex items-center gap-6 border-t px-4 py-1.5 text-xs"
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
        <label className="ml-auto flex items-center gap-2 text-neutral-300">
          <input
            type="checkbox"
            checked={skipAnimations}
            onChange={(event) => setSkipAnimations(event.target.checked)}
          />
          Skip animations
        </label>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectKind={addNodeAtCenter}
      />

      {toast ? (
        <div
          className={`pointer-events-none fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded px-4 py-2 text-sm shadow-lg ${
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
    </ThemeRoot>
  );
}

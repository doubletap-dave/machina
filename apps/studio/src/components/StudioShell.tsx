"use client";

import { accent, canvasBg, font } from "@machina/ui";
import type { Preset } from "@machina/plugin-core";
import { useCallback, useState } from "react";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { loadStudioPrefs } from "@/lib/studio-prefs";
import { resolveMonoFont, resolveUiFont } from "@/lib/studio-fonts";
import { getStudioClient } from "@/lib/machina-client";
import { starterProject } from "@/templates/starter";
import type { Stance } from "@/run/stance";
import { StanceBar } from "@/run/StanceBar";
import { CanvasProvider } from "./Canvas";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";
import { DescribePanel } from "./DescribePanel";
import { Inspector } from "./Inspector";
import { Library } from "./Library";
import { ConfigurationPage } from "./ConfigurationPage";
import { RunPanel } from "./RunPanel";
import { ThemeRoot } from "./ThemeRoot";
import {
  MODE_LABEL,
  StudioFooter,
  StudioHeader,
  StudioWorkspace,
  type StudioMode,
} from "./studio-chrome";

export function StudioShell() {
  const store = useProjectSnapshot();
  const [prefs, setPrefs] = useState(() => loadStudioPrefs());
  const uiFace = resolveUiFont(prefs.uiFont);
  const monoFace = resolveMonoFont(prefs.monoFont);
  const [mode, setMode] = useState<StudioMode>("build");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [skipAnimations, setSkipAnimations] = useState(false);
  const [runPaused, setRunPaused] = useState(false);
  const [possessRequest, setPossessRequest] = useState<string | null>(null);
  const [stance, setStance] = useState<Stance>({ mode: "watch" });
  const [turn, setTurn] = useState(0);
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
        const loaded = await getStudioClient().loadExampleWorld();
        store.replaceProject(loaded);
        showSuccess("Example world loaded.");
      } catch (error) {
        showError(error instanceof Error ? error.message : "Example load failed.");
      }
    },
    [showError, showSuccess, store],
  );

  const validateProject = useCallback(async () => {
    const result = await getStudioClient().compile(store.getProject(), store.getKinds());
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
      uiFontFamily={uiFace.family}
      monoFontFamily={monoFace.family}
      className="flex h-screen flex-col"
      style={{
        background: `var(--machina-canvas-bg, ${canvasBg})`,
        color: `var(--machina-text, ${accent})`,
        fontFamily: `var(--machina-font-ui, ${font})`,
      }}
    >
      <StudioHeader
        brand={
          <>
            <span className="text-sm font-semibold">Machina Studio</span>
            <span className="text-xs" style={{ color: "var(--machina-text-muted)" }}>
              {project.name}
            </span>
            {inSubgraph ? (
              <button
                type="button"
                className="rounded border px-2 py-0.5 text-xs"
                style={{ borderColor: "var(--machina-panel-border)" }}
                onClick={() => store.exitSubgraph()}
              >
                Back to parent graph
              </button>
            ) : null}
          </>
        }
        modes={
          <>
            {(["build", "run", "analyze", "configure"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className="rounded px-3 py-1 font-medium"
                style={
                  mode === tab
                    ? {
                        background: "var(--machina-accent)",
                        color: "var(--machina-canvas-bg)",
                      }
                    : { color: "var(--machina-text-muted)" }
                }
                onClick={() => setMode(tab)}
              >
                {MODE_LABEL[tab]}
              </button>
            ))}
            {mode === "build" ? (
              <button
                type="button"
                className="rounded border px-3 py-1"
                style={{
                  borderColor: "var(--machina-panel-border)",
                  color: "var(--machina-text)",
                }}
                onClick={() => void validateProject()}
              >
                Validate
              </button>
            ) : null}
          </>
        }
        stances={<StanceBar stance={stance} onChange={setStance} />}
      />

      <StudioWorkspace
        mode={mode}
        describe={<DescribePanel onError={showError} onSuccess={showSuccess} />}
        library={
          <Library
            onAddKind={addNodeAtCenter}
            onInsertPreset={insertPresetAtCenter}
            onLoadTemplate={loadTemplate}
          />
        }
        canvas={
          <CanvasProvider
            onEdgeError={showError}
            skipAnimations={skipAnimations}
            runPaused={runPaused}
            onPossessNode={setPossessRequest}
          />
        }
        inspector={<Inspector />}
        runPanel={
          <RunPanel
            onError={showError}
            onPausedChange={setRunPaused}
            possessRequest={possessRequest}
            onPossessConsumed={() => setPossessRequest(null)}
            stance={stance}
            onStanceChange={setStance}
            onTurn={setTurn}
          />
        }
        configure={
          <ConfigurationPage
            prefs={prefs}
            onChange={setPrefs}
            skipAnimations={skipAnimations}
            onSkipAnimations={setSkipAnimations}
          />
        }
      />

      <StudioFooter turn={turn} events={events} cost={cost} errors={errors} />

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

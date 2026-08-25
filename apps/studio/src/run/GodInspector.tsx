"use client";

import type { GodView } from "@machina/core";
import { useEffect, useMemo, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { chromeField, chromeFill } from "../components/studio-chrome";

type GodInspectorProps = {
  runId: string;
  onError?: (message: string) => void;
};

type ResourceDraft = Record<string, Record<string, string>>;

type PendingEdit = { path: string; value: number };

function differingEdits(truth: GodView, draft: ResourceDraft): PendingEdit[] {
  const edits: PendingEdit[] = [];
  for (const [actorId, actor] of Object.entries(truth.actors)) {
    for (const [key, original] of Object.entries(actor.resources)) {
      const raw = draft[actorId]?.[key];
      if (raw === undefined) {
        continue;
      }
      const value = Number(raw);
      if (value === original) {
        continue;
      }
      edits.push({ path: `actors.${actorId}.resources.${key}`, value });
    }
  }
  return edits;
}

export function GodInspector({ runId, onError }: GodInspectorProps) {
  const [truth, setTruth] = useState<GodView | null>(null);
  const [draft, setDraft] = useState<ResourceDraft>({});
  const [noticeable, setNoticeable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getStudioClient()
      .getTruth(runId)
      .then((view) => {
        if (cancelled) {
          return;
        }
        setTruth(view);
        const next: ResourceDraft = {};
        for (const [actorId, actor] of Object.entries(view.actors)) {
          next[actorId] = {};
          for (const [key, value] of Object.entries(actor.resources)) {
            next[actorId]![key] = String(value);
          }
        }
        setDraft(next);
      })
      .catch((error: unknown) => {
        onError?.(error instanceof Error ? error.message : "Could not load truth.");
      });
    return () => {
      cancelled = true;
    };
  }, [onError, runId]);

  const edits = useMemo(() => (truth ? differingEdits(truth, draft) : []), [draft, truth]);
  const canApply = edits.length === 1;

  if (!truth) {
    return null;
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const edit = edits[0];
        if (!canApply || !edit) {
          return;
        }
        void getStudioClient()
          .applyIntervention(runId, {
            path: edit.path,
            value: edit.value,
            noticeable,
          })
          .catch((error: unknown) => {
            onError?.(error instanceof Error ? error.message : "Intervention failed.");
          });
      }}
    >
      {Object.entries(truth.actors).map(([actorId, actor]) => (
        <fieldset key={actorId} className="flex flex-col gap-2">
          <legend className="font-medium">{actor.name}</legend>
          {Object.keys(actor.resources).map((key) => (
            <label key={key} className="flex items-center justify-between gap-2">
              {key}
              <input
                type="number"
                className="w-24 rounded border px-2 py-1"
                style={chromeField}
                value={draft[actorId]?.[key] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    [actorId]: { ...prev[actorId], [key]: value },
                  }));
                }}
              />
            </label>
          ))}
        </fieldset>
      ))}
      <label
        className="flex items-center gap-2 rounded border-2 px-3 py-2 font-semibold"
        style={{ borderColor: "var(--machina-accent)" }}
      >
        <input
          type="checkbox"
          className="size-4"
          checked={noticeable}
          onChange={(event) => setNoticeable(event.target.checked)}
        />
        They can notice this
      </label>
      <button
        type="submit"
        disabled={!canApply}
        className="self-start rounded px-3 py-1 font-medium disabled:opacity-50"
        style={chromeFill}
      >
        Apply
      </button>
    </form>
  );
}

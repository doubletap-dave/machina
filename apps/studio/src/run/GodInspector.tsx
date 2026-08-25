"use client";

import type { GodView } from "@machina/core";
import { useEffect, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { chromeField, chromeFill } from "../components/studio-chrome";

type GodInspectorProps = {
  runId: string;
  onError?: (message: string) => void;
};

export function GodInspector({ runId, onError }: GodInspectorProps) {
  const [truth, setTruth] = useState<GodView | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
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
        const next: Record<string, Record<string, string>> = {};
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

  if (!truth) {
    return null;
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          try {
            const client = getStudioClient();
            for (const [actorId, resources] of Object.entries(draft)) {
              for (const [key, raw] of Object.entries(resources)) {
                await client.applyIntervention(runId, {
                  path: `actors.${actorId}.resources.${key}`,
                  value: Number(raw),
                  noticeable,
                });
              }
            }
          } catch (error) {
            onError?.(error instanceof Error ? error.message : "Intervention failed.");
          }
        })();
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
      <button type="submit" className="self-start rounded px-3 py-1 font-medium" style={chromeFill}>
        Apply
      </button>
    </form>
  );
}

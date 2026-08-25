"use client";

import { composeFromDescription } from "@machina/graph";
import { useCallback, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { modelConfigured } from "@/lib/model-configured";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";

const NO_MODEL =
  "No language model is configured. Build by hand or set an API key.";

type DescribePanelProps = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function DescribePanel({ onError, onSuccess }: DescribePanelProps) {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const compose = useCallback(async () => {
    if (!prompt.trim()) {
      onError("Describe what you want to build.");
      return;
    }

    if (!modelConfigured()) {
      onError(NO_MODEL);
      return;
    }

    setBusy(true);
    try {
      const result = await composeFromDescription(
        prompt,
        registry,
        async () => {
          throw new Error(NO_MODEL);
        },
        async (project) => {
          const compiled = await getStudioClient().compile(project);
          return { ok: compiled.ok, message: compiled.ok ? undefined : compiled.errors[0]?.message };
        },
      );

      if ("errors" in result) {
        onError(result.errors.map((error) => error.message).join(" "));
        return;
      }

      store.replaceProject(result.project);
      onSuccess("Composed graph materialized on the canvas.");
      setPrompt("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Compose failed.");
    } finally {
      setBusy(false);
    }
  }, [onError, onSuccess, prompt, registry, store]);

  return (
    <div className="border-b border-neutral-800 px-4 py-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Describe
      </label>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Two nations with diplomacy…"
          className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void compose()}
          className="rounded bg-neutral-200 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Compose
        </button>
      </div>
    </div>
  );
}

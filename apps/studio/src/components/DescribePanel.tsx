"use client";

import { describeNoLlmCopy } from "@machina/core";
import { useCallback, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import { useProjectSnapshot } from "@/lib/project-store-context";
import { chromeField, chromeFill, chromeMuted } from "./studio-chrome";

type DescribePanelProps = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function DescribePanel({ onError, onSuccess }: DescribePanelProps) {
  const store = useProjectSnapshot();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const compose = useCallback(async () => {
    if (!prompt.trim()) {
      onError("Describe what you want to build.");
      return;
    }

    setBusy(true);
    try {
      const settings = await getStudioClient().getSettings();
      if (settings.default === null) {
        onError(describeNoLlmCopy());
        return;
      }

      const result = await getStudioClient().compose(prompt.trim(), store.getProject());
      if (!result.ok) {
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
  }, [onError, onSuccess, prompt, store]);

  return (
    <div className="border-b px-4 py-3" style={{ borderColor: "var(--machina-panel-border)" }}>
      <label
        className="mb-2 block text-xs font-semibold uppercase tracking-wide"
        style={chromeMuted}
      >
        Describe
      </label>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Two nations with diplomacy…"
          className="min-w-0 flex-1 rounded border px-3 py-2 text-sm outline-none"
          style={chromeField}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => compose()}
          className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={chromeFill}
        >
          Compose
        </button>
      </div>
    </div>
  );
}

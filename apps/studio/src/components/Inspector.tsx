"use client";

import { useEffect, useState } from "react";
import type { SettingsModels } from "@machina/client";
import { getStudioClient } from "@/lib/machina-client";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { findNodeById } from "./Canvas";

const PERSONALITY_FIELDS = ["aggression", "paranoia", "cooperation", "risk"] as const;
const PROVIDERS = ["anthropic", "openai", "openrouter", "perplexity"] as const;
const DEFAULT_OPTION = "Use machine default";

export function Inspector() {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();
  const selected = findNodeById(graph.nodes, store.getSelectedNodeId());
  const [settings, setSettings] = useState<SettingsModels | null>(null);

  useEffect(() => {
    void getStudioClient()
      .getSettings()
      .then(setSettings)
      .catch(() => {
        setSettings(null);
      });
  }, []);

  if (!selected) {
    return (
      <aside className="w-64 border-l border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-500">
        Select a node to inspect it.
      </aside>
    );
  }

  const def = registry.getOrThrow(selected.kind, selected.version);
  const config = selected.config as Record<string, number | string | undefined>;
  const providerValue =
    typeof config.llmProvider === "string" && config.llmProvider.length > 0
      ? config.llmProvider
      : "";
  const modelValue =
    typeof config.llmModel === "string" && config.llmModel.length > 0 ? config.llmModel : "";
  const providerModels = providerValue
    ? (settings?.providers[providerValue]?.models ?? [])
    : [];

  return (
    <aside className="w-64 border-l border-neutral-800 bg-neutral-950 p-3">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Inspector</h2>
      <p className="mb-4 text-sm font-medium text-neutral-100">{def.metadata.name}</p>

      {selected.kind === "cognition.personality" ? (
        <div className="space-y-3">
          {PERSONALITY_FIELDS.map((field) => (
            <label key={field} className="block text-xs text-neutral-400">
              <span className="mb-1 block capitalize">{field}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Number(config[field] ?? 50)}
                onChange={(event) =>
                  store.updateNodeConfig(selected.id, { [field]: Number(event.target.value) })
                }
                className="w-full"
              />
            </label>
          ))}
        </div>
      ) : selected.kind === "cognition.agent" ? (
        <div className="space-y-3">
          <label className="block text-xs text-neutral-400">
            Language model provider
            <select
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
              value={providerValue}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  store.updateNodeConfig(selected.id, {
                    llmProvider: undefined,
                    llmModel: undefined,
                  });
                  return;
                }
                store.updateNodeConfig(selected.id, { llmProvider: next, llmModel: undefined });
              }}
            >
              <option value="">{DEFAULT_OPTION}</option>
              {PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-neutral-400">
            Language model
            <select
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
              value={modelValue}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) {
                  store.updateNodeConfig(selected.id, {
                    llmProvider: undefined,
                    llmModel: undefined,
                  });
                  return;
                }
                store.updateNodeConfig(selected.id, { llmModel: next });
              }}
            >
              <option value="">{DEFAULT_OPTION}</option>
              {providerModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">No editable fields for this node yet.</p>
      )}

      {selected.subgraphId ? (
        <button
          type="button"
          className="mt-4 w-full rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
          onClick={() => store.enterSubgraph(selected.id)}
        >
          Enter nested graph
        </button>
      ) : null}
    </aside>
  );
}

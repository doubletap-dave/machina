"use client";

import { useEffect, useState } from "react";
import type { SettingsModels } from "@machina/client";
import type { KindField } from "@machina/core";
import { getStudioClient } from "@/lib/machina-client";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { KindAuthorForm } from "@/kinds/KindAuthorForm";
import { browserKindLibrary } from "@/kinds/kind-library-client";
import { findNodeById } from "./Canvas";

const TRAIT_KEYS = new Set(["aggression", "paranoia", "cooperation", "risk"]);
const AGENT_LLM_KEYS = new Set(["llmProvider", "llmModel"]);
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

  if (store.isAuthoringKind()) {
    return (
      <aside
        className="min-h-0 flex-1 overflow-y-auto p-3"
        style={{
          background: "var(--machina-panel-bg)",
          borderColor: "var(--machina-panel-border)",
        }}
      >
        <KindAuthorForm library={browserKindLibrary} />
      </aside>
    );
  }

  if (!selected) {
    return (
      <aside
        className="min-h-0 flex-1 p-3 text-sm"
        style={{
          background: "var(--machina-panel-bg)",
          borderColor: "var(--machina-panel-border)",
          color: "var(--machina-text-muted)",
        }}
      >
        Select a node to inspect it.
      </aside>
    );
  }

  const def = registry.getOrThrow(selected.kind, selected.version);
  const config = selected.config as Record<string, number | string | boolean | undefined>;
  const isAgent = selected.kind === "cognition.agent";
  const fields = isAgent
    ? def.fields.filter((field) => !AGENT_LLM_KEYS.has(field.key))
    : def.fields;
  const onChange = (patch: Record<string, unknown>) =>
    store.updateNodeConfig(selected.id, patch);

  return (
    <aside
      className="min-h-0 flex-1 overflow-y-auto p-3"
      style={{
        background: "var(--machina-panel-bg)",
        borderColor: "var(--machina-panel-border)",
      }}
    >
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Inspector</h2>
      <p className="mb-4 text-sm font-medium text-neutral-100">{def.metadata.name}</p>

      {isAgent ? <AgentLlmFields config={config} settings={settings} onChange={onChange} /> : null}
      {fields.length === 0 && !isAgent ? (
        <p className="text-xs text-neutral-500">No editable fields for this node yet.</p>
      ) : (
        <ManifestFields fields={fields} config={config} onChange={onChange} />
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

function AgentLlmFields({
  config,
  settings,
  onChange,
}: {
  config: Record<string, number | string | boolean | undefined>;
  settings: SettingsModels | null;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const providerValue =
    typeof config.llmProvider === "string" && config.llmProvider.length > 0
      ? config.llmProvider
      : "";
  const modelValue =
    typeof config.llmModel === "string" && config.llmModel.length > 0 ? config.llmModel : "";
  const providerModels = providerValue ? (settings?.providers[providerValue]?.models ?? []) : [];

  return (
    <div className="space-y-3">
      <label className="block text-xs text-neutral-400">
        Language model provider
        <select
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
          value={providerValue}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange({ llmProvider: undefined, llmModel: undefined });
              return;
            }
            onChange({ llmProvider: next, llmModel: undefined });
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
              onChange({ llmProvider: undefined, llmModel: undefined });
              return;
            }
            onChange({ llmModel: next });
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
  );
}

function ManifestFields({
  fields,
  config,
  onChange,
}: {
  fields: KindField[];
  config: Record<string, number | string | boolean | undefined>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        if (field.type === "boolean") {
          return (
            <label key={field.key} className="flex items-center gap-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={Boolean(config[field.key] ?? field.default ?? false)}
                onChange={(event) => onChange({ [field.key]: event.target.checked })}
              />
              {field.label}
            </label>
          );
        }
        if (field.type === "enum") {
          return (
            <label key={field.key} className="block text-xs text-neutral-400">
              {field.label}
              <select
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                value={String(config[field.key] ?? field.default ?? "")}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (field.type === "number" && TRAIT_KEYS.has(field.key)) {
          return (
            <label key={field.key} className="block text-xs text-neutral-400">
              {field.label}
              <input
                type="range"
                min={0}
                max={100}
                className="w-full"
                value={Number(config[field.key] ?? field.default ?? 50)}
                onChange={(event) => onChange({ [field.key]: Number(event.target.value) })}
              />
            </label>
          );
        }
        return (
          <label key={field.key} className="block text-xs text-neutral-400">
            {field.label}
            <input
              type={field.type === "number" ? "number" : "text"}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
              value={String(config[field.key] ?? field.default ?? "")}
              onChange={(event) =>
                onChange({
                  [field.key]:
                    field.type === "number" ? Number(event.target.value) : event.target.value,
                })
              }
            />
          </label>
        );
      })}
    </div>
  );
}

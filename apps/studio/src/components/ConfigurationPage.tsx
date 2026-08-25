"use client";

import { noDefaultModelCopy } from "@machina/core";
import type { ProviderId, PublicProviderSlice, SettingsModels } from "@machina/client";
import { useCallback, useEffect, useState } from "react";
import { getStudioClient } from "@/lib/machina-client";
import type { StudioPrefs } from "@/lib/studio-prefs";
import { AppearanceMenu } from "./AppearanceMenu";
import { ProviderPanel } from "./ProviderPanel";

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "perplexity", label: "Perplexity" },
];

function emptySlice(): PublicProviderSlice {
  return { configured: false, verified: false, last4: "", models: [] };
}

function emptySettings(): SettingsModels {
  return {
    default: null,
    providers: {
      anthropic: emptySlice(),
      openai: emptySlice(),
      openrouter: emptySlice(),
      perplexity: emptySlice(),
    },
  };
}

type ConfigurationPageProps = {
  prefs: StudioPrefs;
  onChange: (prefs: StudioPrefs) => void;
  skipAnimations: boolean;
  onSkipAnimations: (skip: boolean) => void;
};

export function ConfigurationPage({
  prefs,
  onChange,
  skipAnimations,
  onSkipAnimations,
}: ConfigurationPageProps) {
  const [settings, setSettings] = useState<SettingsModels>(emptySettings());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getStudioClient()
      .getSettings()
      .then(setSettings)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load settings.");
      });
  }, []);

  const patchProvider = useCallback((id: ProviderId, slice: PublicProviderSlice) => {
    setSettings((prev) => ({
      ...prev,
      providers: { ...prev.providers, [id]: slice },
    }));
  }, []);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4">
      <p className="mb-4 text-sm" style={{ color: "var(--machina-text-muted)" }}>
        {settings.default
          ? `${settings.default.provider} / ${settings.default.model}`
          : noDefaultModelCopy()}
      </p>
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ProviderPanel
            key={provider.id}
            id={provider.id}
            label={provider.label}
            slice={settings.providers[provider.id] ?? emptySlice()}
            onSave={async (apiKey) => {
              const slice = await getStudioClient().putProviderKey(provider.id, apiKey);
              patchProvider(provider.id, slice);
            }}
            onRemove={async () => {
              await getStudioClient().deleteProvider(provider.id);
              setSettings((prev) => ({
                ...prev,
                default: prev.default?.provider === provider.id ? null : prev.default,
                providers: { ...prev.providers, [provider.id]: emptySlice() },
              }));
            }}
            onRefresh={async () => {
              const slice = await getStudioClient().refreshProvider(provider.id);
              patchProvider(provider.id, slice);
            }}
            onSetDefault={async (model) => {
              const result = await getStudioClient().putDefault({
                provider: provider.id,
                model,
              });
              setSettings((prev) => ({ ...prev, default: result.default }));
            }}
          />
        ))}
      </div>
      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--machina-text)" }}>
          Appearance
        </h2>
        <AppearanceMenu prefs={prefs} onChange={onChange} />
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--machina-text)" }}>
          <input
            type="checkbox"
            checked={skipAnimations}
            onChange={(event) => onSkipAnimations(event.target.checked)}
          />
          Skip animations
        </label>
      </section>
    </main>
  );
}

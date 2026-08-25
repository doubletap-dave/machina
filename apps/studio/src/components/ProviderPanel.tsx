"use client";

import { useState } from "react";
import type { ProviderId, PublicProviderSlice } from "@machina/client";
import { filterModels } from "@/lib/filter-models";

type ProviderPanelProps = {
  id: ProviderId;
  label: string;
  slice: PublicProviderSlice;
  onSave: (apiKey: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSetDefault: (model: string) => Promise<void>;
};

export function ProviderPanel({
  id,
  label,
  slice,
  onSave,
  onRemove,
  onRefresh,
  onSetDefault,
}: ProviderPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [filter, setFilter] = useState("");
  const [candidate, setCandidate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const models = filterModels(slice.models, filter);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label={label}
      className="rounded border border-neutral-800 bg-neutral-950 p-3"
    >
      <h2 className="mb-3 text-sm font-medium text-neutral-100">{label}</h2>
      <label className="mb-2 block text-xs text-neutral-400">
        API key
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={slice.configured ? `Key ••••${slice.last4}` : "API key"}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
        />
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          onClick={() =>
            run(async () => {
              await onSave(apiKey);
              setApiKey("");
            })
          }
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          onClick={() => run(onRemove)}
        >
          Remove
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          onClick={() => run(onRefresh)}
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={busy || !candidate}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          onClick={() => {
            if (!candidate) return;
            return run(() => onSetDefault(candidate));
          }}
        >
          Set as default
        </button>
      </div>
      {slice.configured ? (
        <p className="mb-2 text-xs text-neutral-400">••••{slice.last4}</p>
      ) : null}
      <p className="mb-2 text-xs text-neutral-500">
        {slice.verified ? "Verified" : "Not verified"}
      </p>
      {slice.message ? (
        <p className="mb-2 text-xs text-red-400">{slice.message}</p>
      ) : null}
      <label className="mb-2 block text-xs text-neutral-400">
        Filter
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
        />
      </label>
      <ul className="max-h-40 overflow-y-auto text-sm">
        {models.map((model) => (
          <li key={`${id}-${model.id}`}>
            <button
              type="button"
              className={
                candidate === model.id
                  ? "w-full rounded bg-neutral-200 px-2 py-1 text-left text-black"
                  : "w-full rounded px-2 py-1 text-left text-neutral-200 hover:bg-neutral-800"
              }
              onClick={() => setCandidate(model.id)}
            >
              {model.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

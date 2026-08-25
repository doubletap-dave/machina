"use client";

import { useState } from "react";
import type { ProviderId, PublicProviderSlice } from "@machina/client";
import { filterModels } from "@/lib/filter-models";
import { chromeField, chromeFill, chromeGhost, chromeMuted, chromePanel, chromeText } from "./studio-chrome";

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
    <section aria-label={label} className="rounded border p-3" style={chromePanel}>
      <h2 className="mb-3 text-sm font-medium" style={chromeText}>
        {label}
      </h2>
      <label className="mb-2 block text-xs" style={chromeMuted}>
        API key
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={slice.configured ? `Key ••••${slice.last4}` : "API key"}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          style={chromeField}
        />
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="machina-hover rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={chromeGhost}
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
          className="machina-hover rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={chromeGhost}
          onClick={() => run(onRemove)}
        >
          Remove
        </button>
        <button
          type="button"
          disabled={busy}
          className="machina-hover rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={chromeGhost}
          onClick={() => run(onRefresh)}
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={busy || !candidate}
          className="machina-hover rounded border px-2 py-1 text-xs disabled:opacity-50"
          style={chromeGhost}
          onClick={() => {
            if (!candidate) return;
            return run(() => onSetDefault(candidate));
          }}
        >
          Set as default
        </button>
      </div>
      {slice.configured ? (
        <p className="mb-2 text-xs" style={chromeMuted}>
          ••••{slice.last4}
        </p>
      ) : null}
      <p className="mb-2 text-xs" style={chromeMuted}>
        {slice.verified ? "Verified" : "Not verified"}
      </p>
      {slice.message ? (
        <p className="mb-2 text-xs text-red-400">{slice.message}</p>
      ) : null}
      <label className="mb-2 block text-xs" style={chromeMuted}>
        Filter
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          style={chromeField}
        />
      </label>
      <ul className="max-h-40 overflow-y-auto text-sm">
        {models.map((model) => (
          <li key={`${id}-${model.id}`}>
            <button
              type="button"
              className={
                candidate === model.id
                  ? "w-full rounded px-2 py-1 text-left"
                  : "machina-hover w-full rounded px-2 py-1 text-left"
              }
              style={candidate === model.id ? chromeFill : chromeText}
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

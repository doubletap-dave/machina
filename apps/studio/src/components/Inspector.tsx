"use client";

import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { findNodeById } from "./Canvas";

const PERSONALITY_FIELDS = ["aggression", "paranoia", "cooperation", "risk"] as const;

export function Inspector() {
  const store = useProjectSnapshot();
  const registry = useRegistry();
  const graph = store.getCurrentGraph();
  const selected = findNodeById(graph.nodes, store.getSelectedNodeId());

  if (!selected) {
    return (
      <aside className="w-64 border-l border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-500">
        Select a node to inspect it.
      </aside>
    );
  }

  const def = registry.getOrThrow(selected.kind, selected.version);
  const config = selected.config as Record<string, number | string | undefined>;

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

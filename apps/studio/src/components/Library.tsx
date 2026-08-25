"use client";

import { useMemo } from "react";
import { listBuiltinPresets, type Preset } from "@machina/plugin-core";
import { useRegistry } from "@/lib/project-store-context";

type LibraryProps = {
  onAddKind: (kind: string) => void;
  onInsertPreset: (preset: Preset) => void;
  onLoadTemplate: (template: "starter" | "example") => void;
};

export function Library({ onAddKind, onInsertPreset, onLoadTemplate }: LibraryProps) {
  const registry = useRegistry();
  const presets = useMemo(() => listBuiltinPresets(), []);
  const grouped = useMemo(() => {
    const byCategory = new Map<string, { kind: string; name: string }[]>();
    for (const def of registry.list()) {
      const items = byCategory.get(def.metadata.category) ?? [];
      items.push({ kind: def.type, name: def.metadata.name });
      byCategory.set(def.metadata.category, items);
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [registry]);

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-800 bg-neutral-950 p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Library</h2>
      <div className="flex-1 space-y-4 overflow-y-auto">
        <section>
          <h3 className="mb-1 text-xs text-neutral-600">Templates</h3>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => onLoadTemplate("starter")}
              >
                New World
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => onLoadTemplate("example")}
              >
                Example World
              </button>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-xs text-neutral-600">Presets</h3>
          <ul className="space-y-1">
            {presets.map((preset) => (
              <li key={`${preset.category}-${preset.name}`}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                  onClick={() => onInsertPreset(preset)}
                >
                  {preset.name}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {grouped.map(([category, items]) => (
          <section key={category}>
            <h3 className="mb-1 text-xs text-neutral-600">{category}</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.kind}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                    onClick={() => onAddKind(item.kind)}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}

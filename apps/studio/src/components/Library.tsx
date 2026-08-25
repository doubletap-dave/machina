"use client";

import { useMemo } from "react";
import { listBuiltinPresets, type Preset } from "@machina/plugin-core";
import { KIND_GROUP_ORDER, paletteGroup } from "@/lib/library-groups";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";

type LibraryProps = {
  onAddKind: (kind: string) => void;
  onInsertPreset: (preset: Preset) => void;
  onLoadTemplate: (template: "starter" | "example") => void;
};

export function Library({ onAddKind, onInsertPreset, onLoadTemplate }: LibraryProps) {
  const registry = useRegistry();
  const store = useProjectSnapshot();
  const revision = store.getRevision();
  const presets = useMemo(() => listBuiltinPresets(), []);
  const grouped = useMemo(() => {
    const projectKindIds = new Set(store.getKinds().map((kind) => kind.id));
    const byGroup = new Map<string, { kind: string; name: string }[]>();
    for (const def of registry.list()) {
      if (def.type.startsWith("custom.") && !projectKindIds.has(def.type)) {
        continue;
      }
      const group = paletteGroup(def.type, def.metadata.category);
      const items = byGroup.get(group) ?? [];
      items.push({ kind: def.type, name: def.metadata.name });
      byGroup.set(group, items);
    }
    return KIND_GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
      group,
      items: byGroup.get(group) ?? [],
    }));
  }, [registry, revision, store]);

  return (
    <aside
      className="flex h-full w-56 flex-col border-r p-3"
      style={{
        background: "var(--machina-panel-bg)",
        borderColor: "var(--machina-panel-border)",
      }}
    >
      <div className="flex-1 space-y-4 overflow-y-auto">
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

        <section>
          <h3 className="mb-1 text-xs text-neutral-600">Templates</h3>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => onLoadTemplate("starter")}
              >
                New world
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => onLoadTemplate("example")}
              >
                Example world
              </button>
            </li>
            <li>
              <button
                type="button"
                name="New kind"
                className="w-full rounded px-2 py-1 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => store.beginAuthorKind()}
              >
                New kind
              </button>
            </li>
          </ul>
        </section>

        {grouped.map(({ group, items }) => (
          <section key={group}>
            <h3 className="mb-1 text-xs text-neutral-600">{group}</h3>
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

"use client";

import { useMemo } from "react";
import { listBuiltinPresets, type Preset } from "@machina/plugin-core";
import { KIND_GROUP_ORDER, paletteGroup } from "@/lib/library-groups";
import { useProjectSnapshot, useRegistry } from "@/lib/project-store-context";
import { setDragKind } from "@/canvas/dnd.ts";
import { chromeMuted, chromeText } from "./studio-chrome";

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
    <aside className="flex h-full min-h-0 flex-1 flex-col p-3">
      <div className="flex-1 space-y-4 overflow-y-auto">
        <section>
          <h3 className="mb-1 text-xs" style={chromeMuted}>
            Presets
          </h3>
          <ul className="space-y-1">
            {presets.map((preset) => (
              <li key={`${preset.category}-${preset.name}`}>
                <button
                  type="button"
                  className="machina-hover w-full rounded px-2 py-1 text-left text-sm"
                  style={chromeText}
                  onClick={() => onInsertPreset(preset)}
                >
                  {preset.name}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-xs" style={chromeMuted}>
            Templates
          </h3>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                className="machina-hover w-full rounded px-2 py-1 text-left text-sm"
                style={chromeText}
                onClick={() => onLoadTemplate("starter")}
              >
                New world
              </button>
            </li>
            <li>
              <button
                type="button"
                className="machina-hover w-full rounded px-2 py-1 text-left text-sm"
                style={chromeText}
                onClick={() => onLoadTemplate("example")}
              >
                Example world
              </button>
            </li>
            <li>
              <button
                type="button"
                name="New kind"
                className="machina-hover w-full rounded px-2 py-1 text-left text-sm"
                style={chromeText}
                onClick={() => store.beginAuthorKind()}
              >
                New kind
              </button>
            </li>
          </ul>
        </section>

        {grouped.map(({ group, items }) => (
          <section key={group}>
            <h3 className="mb-1 text-xs" style={chromeMuted}>
              {group}
            </h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.kind}>
                  <button
                    type="button"
                    draggable
                    className="machina-hover w-full rounded px-2 py-1 text-left text-sm"
                    style={chromeText}
                    onDragStart={(event) => setDragKind(event, item.kind)}
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

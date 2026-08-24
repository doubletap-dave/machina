"use client";

import { useEffect, useMemo, useState } from "react";
import { useRegistry } from "@/lib/project-store-context";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelectKind: (kind: string) => void;
};

export function CommandPalette({ open, onClose, onSelectKind }: CommandPaletteProps) {
  const registry = useRegistry();
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const all = registry.list().map((def) => ({
      kind: def.type,
      name: def.metadata.name,
      category: def.metadata.category,
    }));
    const q = query.trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [query, registry]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add a node…"
          className="w-full border-b border-neutral-700 bg-transparent px-4 py-3 text-sm text-neutral-100 outline-none"
        />
        <ul className="max-h-64 overflow-y-auto py-2">
          {items.map((item) => (
            <li key={item.kind}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                onClick={() => {
                  onSelectKind(item.kind);
                  onClose();
                }}
              >
                <span>{item.name}</span>
                <span className="text-xs text-neutral-500">{item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

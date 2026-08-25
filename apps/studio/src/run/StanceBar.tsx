"use client";

import type { Stance } from "./stance.ts";

type StanceBarProps = {
  stance: Stance;
  onChange: (stance: Stance) => void;
};

const STANCE_LABEL: Record<Stance["mode"], string> = {
  watch: "Watch",
  god: "God",
  possess: "Possess",
};

export function StanceBar({ stance, onChange }: StanceBarProps) {
  const modes: Stance["mode"][] = ["watch", "god", "possess"];

  return (
    <div role="group" aria-label="Run stance" className="flex gap-1 text-xs">
      {modes.map((mode) => {
        const pressed = stance.mode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={pressed}
            className="rounded px-3 py-1"
            style={{
              background: pressed ? "var(--machina-accent)" : "transparent",
              color: pressed ? "var(--machina-canvas-bg)" : "var(--machina-text-muted)",
              border: "1px solid var(--machina-panel-border)",
            }}
            onClick={() => onChange({ ...stance, mode })}
          >
            {STANCE_LABEL[mode]}
          </button>
        );
      })}
    </div>
  );
}

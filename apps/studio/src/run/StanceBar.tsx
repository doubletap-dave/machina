"use client";

import type { Stance } from "./stance.ts";

type StanceBarProps = {
  stance: Stance;
  onChange: (stance: Stance) => void;
};

export function StanceBar({ stance, onChange }: StanceBarProps) {
  const modes: Stance["mode"][] = ["watch", "god", "possess"];

  return (
    <div role="group" aria-label="Run stance">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={stance.mode === mode}
          onClick={() => onChange({ ...stance, mode })}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

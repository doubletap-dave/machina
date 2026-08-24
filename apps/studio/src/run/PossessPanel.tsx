"use client";

import type { ObservationPacket } from "@machina/core";

type PossessPanelProps = {
  packet: ObservationPacket;
  onAction?: (action: string) => void;
};

export function PossessPanel({ packet, onAction }: PossessPanelProps) {
  return (
    <div data-testid="possess-panel">
      <ul>
        {packet.observations.map((observation) => (
          <li key={observation.attribute}>{observation.attribute}</li>
        ))}
      </ul>
      <div>
        {packet.legalActions.map((action) => (
          <button key={action} type="button" onClick={() => onAction?.(action)}>
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

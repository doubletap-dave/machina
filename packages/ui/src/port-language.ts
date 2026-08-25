import type { PortType } from "@machina/core";

export type PortSymbolId =
  | "disk"
  | "ring"
  | "triangle"
  | "plus"
  | "chevron"
  | "square"
  | "hex"
  | "diamond"
  | "bar"
  | "double-ring"
  | "wedge"
  | "square-ring"
  | "notch";

export type PortLanguage = {
  color: string;
  symbol: PortSymbolId;
  label: string;
};

export const PORT_LANGUAGE = {
  CLOCK: { color: "#e4b84a", symbol: "disk", label: "Clock" },
  OBSERVATION: { color: "#4ec4d9", symbol: "ring", label: "Observation" },
  ACTION: { color: "#9ad64a", symbol: "triangle", label: "Action" },
  EVENT: { color: "#e07a3d", symbol: "plus", label: "Event" },
  MESSAGE: { color: "#a78bfa", symbol: "chevron", label: "Message" },
  RESOURCE: { color: "#f0c14b", symbol: "square", label: "Resource" },
  PERSONALITY: { color: "#e879a8", symbol: "hex", label: "Personality" },
  GOAL: { color: "#f5e6c8", symbol: "diamond", label: "Goal" },
  MEMORY: { color: "#2dd4bf", symbol: "bar", label: "Memory" },
  RELATIONSHIP: { color: "#f472b6", symbol: "double-ring", label: "Relationship" },
  SIGNAL: { color: "#60a5fa", symbol: "wedge", label: "Signal" },
  WORLD_STATE: { color: "#94a3b8", symbol: "square-ring", label: "World state" },
  ACTOR_REF: { color: "#d6b48a", symbol: "notch", label: "Actor" },
} as const satisfies Record<PortType, PortLanguage>;

export function portLanguage(type: PortType): PortLanguage {
  const language = PORT_LANGUAGE[type];
  if (!language) {
    throw new Error(`Machina doesn't know a port called ${type}.`);
  }
  return language;
}

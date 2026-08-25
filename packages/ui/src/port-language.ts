import type { PortType } from "@machina/core";

export type PortSymbolId =
  | "clock"
  | "eye"
  | "play"
  | "burst"
  | "envelope"
  | "coin"
  | "mask"
  | "flag"
  | "book"
  | "link"
  | "radio"
  | "globe"
  | "person";

export type PortLanguage = {
  color: string;
  symbol: PortSymbolId;
  label: string;
};

export const PORT_LANGUAGE = {
  CLOCK: { color: "#e4b84a", symbol: "clock", label: "Clock" },
  OBSERVATION: { color: "#4ec4d9", symbol: "eye", label: "Observation" },
  ACTION: { color: "#9ad64a", symbol: "play", label: "Action" },
  EVENT: { color: "#e07a3d", symbol: "burst", label: "Event" },
  MESSAGE: { color: "#a78bfa", symbol: "envelope", label: "Message" },
  RESOURCE: { color: "#f0c14b", symbol: "coin", label: "Resource" },
  PERSONALITY: { color: "#e879a8", symbol: "mask", label: "Personality" },
  GOAL: { color: "#f5e6c8", symbol: "flag", label: "Goal" },
  MEMORY: { color: "#2dd4bf", symbol: "book", label: "Memory" },
  RELATIONSHIP: { color: "#f472b6", symbol: "link", label: "Relationship" },
  SIGNAL: { color: "#60a5fa", symbol: "radio", label: "Signal" },
  WORLD_STATE: { color: "#94a3b8", symbol: "globe", label: "World state" },
  ACTOR_REF: { color: "#d6b48a", symbol: "person", label: "Actor" },
} as const satisfies Record<PortType, PortLanguage>;

export function portLanguage(type: PortType): PortLanguage {
  const language = PORT_LANGUAGE[type];
  if (!language) {
    throw new Error(`Machina doesn't know a port called ${type}.`);
  }
  return language;
}

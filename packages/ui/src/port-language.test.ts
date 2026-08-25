import { describe, expect, it } from "vitest";
import type { PortType } from "@machina/core";
import { PORT_LANGUAGE, portLanguage } from "./index.ts";

const CORE_PORT_TYPES: PortType[] = [
  "ACTOR_REF",
  "WORLD_STATE",
  "OBSERVATION",
  "ACTION",
  "EVENT",
  "RESOURCE",
  "MESSAGE",
  "RELATIONSHIP",
  "MEMORY",
  "SIGNAL",
  "CLOCK",
  "PERSONALITY",
  "GOAL",
];

const SPEC_COLORS: Record<PortType, string> = {
  CLOCK: "#e4b84a",
  OBSERVATION: "#4ec4d9",
  ACTION: "#9ad64a",
  EVENT: "#e07a3d",
  MESSAGE: "#a78bfa",
  RESOURCE: "#f0c14b",
  PERSONALITY: "#e879a8",
  GOAL: "#f5e6c8",
  MEMORY: "#2dd4bf",
  RELATIONSHIP: "#f472b6",
  SIGNAL: "#60a5fa",
  WORLD_STATE: "#94a3b8",
  ACTOR_REF: "#d6b48a",
};

describe("PORT_LANGUAGE", () => {
  it("has exactly the PortTypes from core", () => {
    expect(Object.keys(PORT_LANGUAGE).sort()).toEqual([...CORE_PORT_TYPES].sort());
  });

  it("looks up CLOCK gold", () => {
    expect(portLanguage("CLOCK").color).toBe("#e4b84a");
  });

  it("looks up OBSERVATION eye", () => {
    expect(portLanguage("OBSERVATION").symbol).toBe("eye");
  });

  it("matches the spec color table exactly", () => {
    for (const type of CORE_PORT_TYPES) {
      expect(portLanguage(type).color).toBe(SPEC_COLORS[type]);
    }
  });
});

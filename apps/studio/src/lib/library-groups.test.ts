import { describe, expect, it } from "vitest";
import { paletteGroup } from "./library-groups.ts";

describe("paletteGroup", () => {
  it("maps cognition.personality to Behavior", () => {
    expect(paletteGroup("cognition.personality", "Cognition")).toBe("Behavior");
  });

  it.each([
    ["entities.actor", "Entities", "Actors"],
    ["entities.world", "Entities", "World"],
    ["entities.resource", "Entities", "World"],
    ["control.clock", "Control", "World"],
    ["control.event", "Control", "World"],
    ["cognition.agent", "Cognition", "Behavior"],
    ["perception.perception", "Perception", "Behavior"],
    ["systems.system", "Systems", "Systems"],
    ["systems.relationship", "Systems", "Systems"],
    ["analysis.logger", "Analysis", "Output"],
    ["analysis.inspector", "Analysis", "Output"],
  ] as const)("maps %s (%s) to %s", (kind, category, group) => {
    expect(paletteGroup(kind, category)).toBe(group);
  });
});

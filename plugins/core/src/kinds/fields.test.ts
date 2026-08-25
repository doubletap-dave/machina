import { expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "../index.ts";

it("every core kind has inspector fields", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  for (const def of registry.list()) {
    expect(def.fields.length, def.type).toBeGreaterThan(0);
  }
});

it("clock tick is labeled Tick", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  expect(registry.getOrThrow("control.clock", 1).ports.tick.label).toBe("Tick");
});

it("goal statement defaults so the Inspector can open", () => {
  const registry = createRegistry();
  registerCoreKinds(registry);
  expect(registry.getOrThrow("cognition.goal", 1).configSchema.parse({})).toEqual({
    statement: "New goal",
    priority: 50,
  });
});

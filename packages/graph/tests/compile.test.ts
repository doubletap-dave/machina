import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { compile } from "../src/index.ts";
import type { MachinaProject } from "@machina/core";

function registry() {
  const r = createRegistry();
  registerCoreKinds(r);
  return r;
}

const empty: MachinaProject = {
  schemaVersion: 1,
  id: "p",
  name: "Empty",
  entryGraphId: "g",
  presetRefs: [],
  graphs: [{ id: "g", nodes: [], edges: [] }],
};

describe("compile", () => {
  it("fails without a Clock", () => {
    const result = compile(empty, registry());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe(
        "This world needs a Clock before it can run.",
      );
    }
  });

  it("returns a plan with only a Clock and no edges", () => {
    const project: MachinaProject = {
      ...empty,
      graphs: [
        {
          id: "g",
          nodes: [
            {
              id: "clock",
              kind: "control.clock",
              version: 1,
              position: { x: 0, y: 0 },
              config: { period: "month" },
            },
          ],
          edges: [],
        },
      ],
    };
    const result = compile(project, registry());
    expect("plan" in result).toBe(true);
    if ("plan" in result) {
      expect(result.plan.projectId).toBe("p");
      expect(result.plan.clock.nodeId).toBe("clock");
      expect(result.plan.systems).toEqual([]);
      expect(result.plan.agents).toEqual([]);
      expect(result.plan.perception).toEqual([]);
      expect(result.plan.analysis).toEqual([]);
    }
  });
});

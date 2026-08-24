import { describe, expect, it, vi } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaProject } from "@machina/core";
import { composeFromDescription } from "../src/compose.ts";

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

const withClock: MachinaProject = {
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

describe("composeFromDescription", () => {
  it("retries until compile succeeds and smoke passes", async () => {
    let calls = 0;
    const proposer = vi.fn(async () => {
      calls += 1;
      return calls < 3 ? empty : withClock;
    });
    const smoke = vi.fn(async () => ({ ok: true }));

    const result = await composeFromDescription(
      "a world with time",
      registry(),
      proposer,
      smoke,
    );

    expect("project" in result).toBe(true);
    expect(proposer).toHaveBeenCalledTimes(3);
    expect(smoke).toHaveBeenCalledTimes(1);
  });

  it("returns errors after exhausting repairs", async () => {
    const proposer = vi.fn(async () => empty);
    const smoke = vi.fn(async () => ({ ok: true }));

    const result = await composeFromDescription(
      "broken",
      registry(),
      proposer,
      smoke,
      3,
    );

    expect("errors" in result).toBe(true);
    expect(proposer).toHaveBeenCalledTimes(4);
    expect(smoke).not.toHaveBeenCalled();
    if ("errors" in result) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect("project" in result).toBe(false);
    }
  });

  it("returns errors when smoke fails", async () => {
    const proposer = vi.fn(async () => withClock);
    const smoke = vi.fn(async () => ({
      ok: false,
      message: "Illegal action in smoke turn.",
    }));

    const result = await composeFromDescription(
      "smoke fail",
      registry(),
      proposer,
      smoke,
      0,
    );

    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("Illegal action in smoke turn.");
    }
    expect("project" in result).toBe(false);
  });
});

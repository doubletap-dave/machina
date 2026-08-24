import { describe, expect, it } from "vitest";
import type { MachinaProject } from "@machina/core";
import { runCli } from "../src/cli.ts";

const project: MachinaProject = {
  schemaVersion: 1,
  id: "p1",
  name: "CLI Test",
  entryGraphId: "g1",
  presetRefs: [],
  graphs: [{ id: "g1", nodes: [], edges: [] }],
};

describe("machina CLI", () => {
  it("runs a project for the requested number of turns", async () => {
    let steps = 0;
    const output = await runCli(["run", "/tmp/project", "--turns", "2"], {
      loadProject: async () => project,
      step: async () => {
        steps += 1;
        return { turn: steps };
      },
    });
    expect(output).toContain("turns=2");
    expect(steps).toBe(2);
  });

  it("prints ok for machina test", async () => {
    const output = await runCli(["test"]);
    expect(output).toContain("ok");
  });
});

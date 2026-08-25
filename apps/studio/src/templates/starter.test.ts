import { describe, expect, it } from "vitest";
import { compile } from "@machina/graph";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { starterProject } from "./starter.ts";

function registry() {
  const r = createRegistry();
  registerCoreKinds(r);
  return r;
}

describe("starterProject", () => {
  it("compiles with world logger and inspector configs filled", () => {
    const project = starterProject();
    const nodes = project.graphs[0]!.nodes;
    expect(nodes.find((n) => n.kind === "entities.world")?.config).toEqual({
      name: "World",
    });
    expect(nodes.find((n) => n.kind === "analysis.logger")?.config).toEqual({
      record: "both",
    });
    expect(nodes.find((n) => n.kind === "analysis.inspector")?.config).toEqual({
      title: "Inspector",
    });

    const result = compile(project, registry());
    expect("plan" in result).toBe(true);
  });
});

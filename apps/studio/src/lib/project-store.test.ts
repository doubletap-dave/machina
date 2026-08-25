import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { nationPreset, registerCoreKinds } from "@machina/plugin-core";
import { starterProject } from "../templates/starter.ts";
import { createProjectStore } from "./project-store.ts";

function testRegistry() {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

describe("createProjectStore", () => {
  it("addNode sets kind, version 1, and appends to entry graph", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getProject().graphs[0]?.nodes.length ?? 0;
    const node = store.addNode("cognition.personality", { x: 10, y: 20 });

    expect(node.kind).toBe("cognition.personality");
    expect(node.version).toBe(1);
    expect(store.getProject().graphs[0]?.nodes).toHaveLength(before + 1);
    expect(store.getProject().graphs[0]?.nodes.at(-1)?.id).toBe(node.id);
  });

  it("addEdge refuses resource output into personality input", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getProject().graphs[0]?.edges.length ?? 0;
    const resource = store.addNode("entities.resource", { x: 0, y: 0 });
    const agent = store.addNode("cognition.agent", { x: 100, y: 0 });

    const err = store.addEdge({
      sourceNode: resource.id,
      sourcePort: "stock",
      targetNode: agent.id,
      targetPort: "personality",
    });

    expect(err?.message).toBe(
      "A resource can't shape a personality. Attach it to a nation or an economy.",
    );
    expect(store.getProject().graphs[0]?.edges).toHaveLength(before);
  });

  it("addEdge allows matching RESOURCE ports", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getProject().graphs[0]?.edges.length ?? 0;
    const resource = store.addNode("entities.resource", { x: 0, y: 0 });
    store.addNode("entities.resource", { x: 50, y: 0 });
    const system = store.addNode("systems.system", { x: 100, y: 0 });

    const err = store.addEdge({
      sourceNode: resource.id,
      sourcePort: "stock",
      targetNode: system.id,
      targetPort: "resources",
    });

    expect(err).toBeNull();
    expect(store.getProject().graphs[0]?.edges).toHaveLength(before + 1);
  });

  it("enterSubgraph no-ops without subgraphId; actor creates nested graph", () => {
    const store = createProjectStore(testRegistry());
    const personality = store.addNode("cognition.personality", { x: 0, y: 0 });
    const entryGraphId = store.getCurrentGraphId();

    store.enterSubgraph(personality.id);
    expect(store.getCurrentGraphId()).toBe(entryGraphId);

    const actor = store.addNode("entities.actor", { x: 0, y: 0 });
    expect(actor.subgraphId).toBeDefined();

    store.enterSubgraph(actor.id);
    expect(store.getCurrentGraphId()).toBe(actor.subgraphId);
    expect(store.getCurrentGraph().parentNodeId).toBe(actor.id);

    store.exitSubgraph();
    expect(store.getCurrentGraphId()).toBe(entryGraphId);
  });

  it("insertPreset materializes nation actor and nested cabinet graph", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getCurrentGraph().nodes.length;
    const nodes = store.insertPreset(nationPreset("Atlantic Federation"), { x: 20, y: 30 });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.kind).toBe("entities.actor");
    expect(store.getProject().graphs).toHaveLength(2);
    expect(store.getCurrentGraph().nodes).toHaveLength(before + 1);

    const actor = store.getCurrentGraph().nodes.find((node) => node.id === nodes[0]?.id);
    store.enterSubgraph(actor!.id);
    expect(store.getCurrentGraph().nodes.filter((n) => n.kind === "cognition.agent")).toHaveLength(2);
  });

  it("replaceProject swaps the in-memory project", () => {
    const store = createProjectStore(testRegistry());
    store.replaceProject(starterProject());
    expect(store.getProject().name).toBe("New World");
    expect(store.getCurrentGraph().nodes.some((node) => node.kind === "control.clock")).toBe(true);
  });

  it("setNodePosition updates the node during repeated calls", () => {
    const store = createProjectStore(testRegistry());
    const node = store.addNode("cognition.personality", { x: 0, y: 0 });
    store.setNodePosition(node.id, { x: 40, y: 80 });
    expect(store.getCurrentGraph().nodes.find((n) => n.id === node.id)?.position).toEqual({
      x: 40,
      y: 80,
    });
    store.setNodePosition(node.id, { x: 120, y: 200 });
    expect(store.getCurrentGraph().nodes.find((n) => n.id === node.id)?.position).toEqual({
      x: 120,
      y: 200,
    });
  });
});

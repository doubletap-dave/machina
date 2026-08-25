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

  it("deleteNodes drops node and incident edges; undo restores same ids", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getCurrentGraph();
    expect(before.nodes.some((node) => node.id === "clock")).toBe(true);
    expect(before.nodes.some((node) => node.id === "world")).toBe(true);
    expect(before.edges.some((edge) => edge.id === "clock-world")).toBe(true);
    expect(before.edges.some((edge) => edge.id === "world-inspector")).toBe(true);

    store.deleteNodes(["world"]);

    const afterDelete = store.getCurrentGraph();
    expect(afterDelete.nodes.find((node) => node.id === "world")).toBeUndefined();
    expect(afterDelete.nodes.find((node) => node.id === "clock")).toBeDefined();
    expect(afterDelete.edges.find((edge) => edge.id === "clock-world")).toBeUndefined();
    expect(afterDelete.edges.find((edge) => edge.id === "world-inspector")).toBeUndefined();

    store.undo();

    const restored = store.getCurrentGraph();
    expect(restored.nodes.find((node) => node.id === "world")?.id).toBe("world");
    expect(restored.edges.find((edge) => edge.id === "clock-world")?.id).toBe("clock-world");
    expect(restored.edges.find((edge) => edge.id === "world-inspector")?.id).toBe("world-inspector");
  });

  it("deleteNodes removes descendant graphs of an actor", () => {
    const store = createProjectStore(testRegistry());
    const actor = store.addNode("entities.actor", { x: 0, y: 0 });
    const subgraphId = actor.subgraphId;
    expect(subgraphId).toBeDefined();
    expect(store.getProject().graphs.some((graph) => graph.id === subgraphId)).toBe(true);

    store.deleteNodes([actor.id]);

    expect(store.getCurrentGraph().nodes.find((node) => node.id === actor.id)).toBeUndefined();
    expect(store.getProject().graphs.some((graph) => graph.id === subgraphId)).toBe(false);

    store.undo();

    expect(store.getCurrentGraph().nodes.find((node) => node.id === actor.id)?.subgraphId).toBe(
      subgraphId,
    );
    expect(store.getProject().graphs.some((graph) => graph.id === subgraphId)).toBe(true);
  });

  it("duplicateNodes on actor-with-subgraph yields new graph ids; original graphs unchanged", () => {
    const store = createProjectStore(testRegistry());
    const actor = store.addNode("entities.actor", { x: 10, y: 20 });
    const originalSubgraphId = actor.subgraphId!;
    store.enterSubgraph(actor.id);
    const inner = store.addNode("cognition.personality", { x: 1, y: 2 });
    store.exitSubgraph();

    const newIds = store.duplicateNodes([actor.id]);

    expect(newIds).toHaveLength(1);
    expect(newIds[0]).not.toBe(actor.id);

    const copy = store.getCurrentGraph().nodes.find((node) => node.id === newIds[0]);
    expect(copy?.kind).toBe("entities.actor");
    expect(copy?.subgraphId).toBeDefined();
    expect(copy?.subgraphId).not.toBe(originalSubgraphId);
    expect(copy?.position).toEqual({ x: 50, y: 60 });
    expect(copy?.config).toEqual(actor.config);

    const original = store.getCurrentGraph().nodes.find((node) => node.id === actor.id);
    expect(original?.subgraphId).toBe(originalSubgraphId);
    const originalGraph = store.getProject().graphs.find((graph) => graph.id === originalSubgraphId);
    expect(originalGraph?.nodes.map((node) => node.id)).toEqual([inner.id]);

    const copyGraph = store.getProject().graphs.find((graph) => graph.id === copy?.subgraphId);
    expect(copyGraph?.parentNodeId).toBe(copy?.id);
    expect(copyGraph?.nodes).toHaveLength(1);
    expect(copyGraph?.nodes[0]?.id).not.toBe(inner.id);
    expect(copyGraph?.nodes[0]?.kind).toBe("cognition.personality");
    expect(copyGraph?.nodes[0]?.config).toEqual(inner.config);
    expect(store.getSelectedNodeId()).toBe(newIds[0]);
  });

  it("duplicateNodes remaps internal edges and does not copy wires to other nodes", () => {
    const store = createProjectStore(testRegistry());
    const resource = store.addNode("entities.resource", { x: 0, y: 0 });
    const system = store.addNode("systems.system", { x: 100, y: 0 });
    expect(
      store.addEdge({
        sourceNode: resource.id,
        sourcePort: "stock",
        targetNode: system.id,
        targetPort: "resources",
      }),
    ).toBeNull();
    const beforeEdgeCount = store.getCurrentGraph().edges.length;

    const both = store.duplicateNodes([resource.id, system.id]);
    expect(store.getCurrentGraph().edges).toHaveLength(beforeEdgeCount + 1);
    expect(
      store.getCurrentGraph().edges.some(
        (edge) => edge.sourceNode === both[0] && edge.targetNode === both[1],
      ),
    ).toBe(true);

    store.undo();
    const onlyResource = store.duplicateNodes([resource.id]);
    expect(store.getCurrentGraph().edges).toHaveLength(beforeEdgeCount);
    expect(
      store.getCurrentGraph().edges.some(
        (edge) => edge.sourceNode === onlyResource[0] || edge.targetNode === onlyResource[0],
      ),
    ).toBe(false);
  });

  it("duplicateNodes remaps nation preset parent-graph cabinet wires; originals unchanged", () => {
    const store = createProjectStore(testRegistry());
    const inserted = store.insertPreset(nationPreset("Atlantic Federation"), { x: 20, y: 30 });
    const actor = inserted[0]!;
    const originalSubgraphId = actor.subgraphId!;
    const originalCross = store
      .getCurrentGraph()
      .edges.filter((edge) => edge.targetNode === actor.id);
    expect(originalCross).toHaveLength(3);
    const originalCrossIds = originalCross.map((edge) => edge.id);

    const copyIds = store.duplicateNodes([actor.id]);
    const copy = store.getCurrentGraph().nodes.find((node) => node.id === copyIds[0]);
    const copiedCross = store
      .getCurrentGraph()
      .edges.filter((edge) => edge.targetNode === copy?.id);
    expect(copiedCross).toHaveLength(3);

    expect(
      originalCrossIds.every((id) => store.getCurrentGraph().edges.some((edge) => edge.id === id)),
    ).toBe(true);
    expect(store.getCurrentGraph().nodes.find((node) => node.id === actor.id)?.subgraphId).toBe(
      originalSubgraphId,
    );

    const copyCabinet = store.getProject().graphs.find((graph) => graph.id === copy?.subgraphId);
    const originalCabinet = store
      .getProject()
      .graphs.find((graph) => graph.id === originalSubgraphId);
    const copyCabinetIds = new Set(copyCabinet?.nodes.map((node) => node.id));
    const originalCabinetIds = new Set(originalCabinet?.nodes.map((node) => node.id));

    for (const edge of copiedCross) {
      expect(copyCabinetIds.has(edge.sourceNode)).toBe(true);
      expect(originalCabinetIds.has(edge.sourceNode)).toBe(false);
    }
    for (const edge of originalCross) {
      expect(originalCabinetIds.has(edge.sourceNode)).toBe(true);
      expect(copyCabinetIds.has(edge.sourceNode)).toBe(false);
    }
  });

  it("deleteNodes in cabinet drops parent-graph wires to that node; undo restores them", () => {
    const store = createProjectStore(testRegistry());
    const inserted = store.insertPreset(nationPreset("Atlantic Federation"), { x: 20, y: 30 });
    store.enterSubgraph(inserted[0]!.id);
    const personality = store
      .getCurrentGraph()
      .nodes.find((node) => node.kind === "cognition.personality")!;
    const parentGraphId = store.getCurrentGraph().parentGraphId!;
    const parentBefore = store.getProject().graphs.find((graph) => graph.id === parentGraphId)!;
    const wires = parentBefore.edges.filter(
      (edge) => edge.sourceNode === personality.id || edge.targetNode === personality.id,
    );
    expect(wires.length).toBeGreaterThan(0);
    const wireIds = wires.map((edge) => edge.id);

    store.deleteNodes([personality.id]);

    const parentAfter = store.getProject().graphs.find((graph) => graph.id === parentGraphId)!;
    expect(
      parentAfter.edges.some(
        (edge) => edge.sourceNode === personality.id || edge.targetNode === personality.id,
      ),
    ).toBe(false);
    expect(store.getCurrentGraph().nodes.find((node) => node.id === personality.id)).toBeUndefined();

    store.undo();

    const parentRestored = store.getProject().graphs.find((graph) => graph.id === parentGraphId)!;
    for (const id of wireIds) {
      expect(parentRestored.edges.some((edge) => edge.id === id)).toBe(true);
    }
    expect(store.getCurrentGraph().nodes.find((node) => node.id === personality.id)).toBeDefined();
  });

  it("deleteEdges removes only those edges; undo restores them", () => {
    const store = createProjectStore(testRegistry());
    store.deleteEdges(["clock-world"]);
    expect(store.getCurrentGraph().edges.find((edge) => edge.id === "clock-world")).toBeUndefined();
    expect(store.getCurrentGraph().edges.find((edge) => edge.id === "world-inspector")).toBeDefined();
    store.undo();
    expect(store.getCurrentGraph().edges.find((edge) => edge.id === "clock-world")?.id).toBe(
      "clock-world",
    );
  });

  it("51st undo-worthy mutation drops the oldest snapshot", () => {
    const store = createProjectStore(testRegistry());
    for (let i = 0; i < 51; i++) {
      store.updateNodeConfig("clock", { period: `p${i}` });
    }

    expect(clockConfig(store)).toEqual({ period: "p50" });

    for (let i = 0; i < 50; i++) {
      store.undo();
    }

    expect(clockConfig(store)).toEqual({ period: "p0" });
    store.undo();
    expect(clockConfig(store)).toEqual({ period: "p0" });
  });

  it("beginDrag plus many setNodePosition plus endDrag is one undo back to start", () => {
    const store = createProjectStore(testRegistry());
    store.beginDrag("clock");
    store.setNodePosition("clock", { x: 100, y: 100 });
    store.setNodePosition("clock", { x: 200, y: 180 });
    store.setNodePosition("clock", { x: 300, y: 220 });
    store.endDrag();

    expect(clockPosition(store)).toEqual({ x: 300, y: 220 });
    store.undo();
    expect(clockPosition(store)).toEqual({ x: 40, y: 40 });
  });

  it("updateNodeConfig pushes one undo per patch", () => {
    const store = createProjectStore(testRegistry());
    store.updateNodeConfig("clock", { period: "week" });
    store.updateNodeConfig("clock", { period: "year" });

    expect(clockConfig(store)).toEqual({ period: "year" });
    store.undo();
    expect(clockConfig(store)).toEqual({ period: "week" });
    store.undo();
    expect(clockConfig(store)).toEqual({ period: "month" });
    store.redo();
    expect(clockConfig(store)).toEqual({ period: "week" });
    store.redo();
    expect(clockConfig(store)).toEqual({ period: "year" });
  });

  it("replaceProject clears the undo stack", () => {
    const store = createProjectStore(testRegistry());
    store.updateNodeConfig("clock", { period: "week" });
    store.replaceProject(starterProject());
    store.undo();
    expect(clockConfig(store)).toEqual({ period: "month" });
  });

  it("addNode then undo removes the node", () => {
    const store = createProjectStore(testRegistry());
    const before = store.getCurrentGraph().nodes.length;
    const node = store.addNode("cognition.personality", { x: 10, y: 20 });

    expect(store.getCurrentGraph().nodes.some((candidate) => candidate.id === node.id)).toBe(true);
    store.undo();
    expect(store.getCurrentGraph().nodes).toHaveLength(before);
    expect(store.getCurrentGraph().nodes.find((candidate) => candidate.id === node.id)).toBeUndefined();
  });

  it("addEdge then undo removes the legal edge", () => {
    const store = createProjectStore(testRegistry());
    const resource = store.addNode("entities.resource", { x: 0, y: 0 });
    const system = store.addNode("systems.system", { x: 100, y: 0 });
    const beforeEdges = store.getCurrentGraph().edges.length;

    expect(
      store.addEdge({
        sourceNode: resource.id,
        sourcePort: "stock",
        targetNode: system.id,
        targetPort: "resources",
      }),
    ).toBeNull();
    expect(store.getCurrentGraph().edges).toHaveLength(beforeEdges + 1);

    store.undo();
    expect(store.getCurrentGraph().edges).toHaveLength(beforeEdges);
    expect(store.getCurrentGraph().nodes.find((candidate) => candidate.id === resource.id)).toBeDefined();
    expect(store.getCurrentGraph().nodes.find((candidate) => candidate.id === system.id)).toBeDefined();
  });

  it("illegal addEdge does not consume an undo slot", () => {
    const store = createProjectStore(testRegistry());
    const resource = store.addNode("entities.resource", { x: 0, y: 0 });
    const agent = store.addNode("cognition.agent", { x: 100, y: 0 });

    const err = store.addEdge({
      sourceNode: resource.id,
      sourcePort: "stock",
      targetNode: agent.id,
      targetPort: "personality",
    });
    expect(err).not.toBeNull();

    store.undo();
    expect(store.getCurrentGraph().nodes.find((candidate) => candidate.id === agent.id)).toBeUndefined();
    expect(store.getCurrentGraph().nodes.find((candidate) => candidate.id === resource.id)).toBeDefined();
  });

  it("insertPreset then undo restores prior graph counts", () => {
    const store = createProjectStore(testRegistry());
    const nodeCount = store.getCurrentGraph().nodes.length;
    const graphCount = store.getProject().graphs.length;

    store.insertPreset(nationPreset("Atlantic Federation"), { x: 20, y: 30 });
    expect(store.getCurrentGraph().nodes.length).toBeGreaterThan(nodeCount);
    expect(store.getProject().graphs.length).toBeGreaterThan(graphCount);

    store.undo();
    expect(store.getCurrentGraph().nodes).toHaveLength(nodeCount);
    expect(store.getProject().graphs).toHaveLength(graphCount);
  });
});

function clockConfig(store: ReturnType<typeof createProjectStore>) {
  return store.getCurrentGraph().nodes.find((node) => node.id === "clock")?.config;
}

function clockPosition(store: ReturnType<typeof createProjectStore>) {
  return store.getCurrentGraph().nodes.find((node) => node.id === "clock")?.position;
}

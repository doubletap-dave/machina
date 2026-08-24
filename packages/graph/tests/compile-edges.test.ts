import { describe, expect, it } from "vitest";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import type { MachinaProject } from "@machina/core";
import { compile } from "../src/index.ts";

function registry() {
  const r = createRegistry();
  registerCoreKinds(r);
  return r;
}

const baseProject = (): MachinaProject => ({
  schemaVersion: 1,
  id: "p",
  name: "Edges",
  entryGraphId: "g",
  presetRefs: [],
  graphs: [{ id: "g", nodes: [], edges: [] }],
});

function node(
  id: string,
  kind: string,
  version = 1,
  config: unknown = {},
) {
  return {
    id,
    kind,
    version,
    position: { x: 0, y: 0 },
    config,
  };
}

function edge(
  id: string,
  sourceNode: string,
  sourcePort: string,
  targetNode: string,
  targetPort: string,
) {
  return { id, sourceNode, sourcePort, targetNode, targetPort };
}

describe("compile edge validation", () => {
  it("rejects unknown node kinds", () => {
    const project: MachinaProject = {
      ...baseProject(),
      graphs: [
        {
          id: "g",
          nodes: [
            node("clock", "control.clock"),
            node("bad", "nope.thing"),
          ],
          edges: [],
        },
      ],
    };
    const result = compile(project, registry());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe(
        "Machina doesn't know a node called nope.thing.",
      );
    }
  });

  it("rejects version mismatches", () => {
    const project: MachinaProject = {
      ...baseProject(),
      graphs: [
        {
          id: "g",
          nodes: [
            node("clock", "control.clock"),
            node("agent", "cognition.agent", 99),
          ],
          edges: [],
        },
      ],
    };
    const result = compile(project, registry());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("This node needs an update.");
    }
  });

  it("rejects Resource → Personality with operator copy", () => {
    const project: MachinaProject = {
      ...baseProject(),
      graphs: [
        {
          id: "g",
          nodes: [
            node("clock", "control.clock"),
            node("resource", "entities.resource"),
            node("personality", "cognition.personality"),
          ],
          edges: [
            edge("e1", "resource", "stock", "personality", "traits"),
          ],
        },
      ],
    };
    const result = compile(project, registry());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      const err = result.errors.find((e) => e.code === "PORT_TYPE_MISMATCH");
      expect(err?.message).toBe(
        "A resource can't shape a personality. Attach it to a nation or an economy.",
      );
      expect(err?.nodeId).toBe("personality");
    }
  });
});

describe("compile full fixture", () => {
  it("builds a SimulationPlan from a wired world", () => {
    const project: MachinaProject = {
      ...baseProject(),
      graphs: [
        {
          id: "g",
          nodes: [
            node("clock", "control.clock", 1, { period: "month" }),
            node("world", "entities.world"),
            node("actor", "entities.actor", 1, { name: "Nation" }),
            node("personality", "cognition.personality"),
            node("goal", "cognition.goal"),
            node("memory", "cognition.memory"),
            node("perception", "perception.perception"),
            node("agent", "cognition.agent"),
            node("system", "systems.system"),
          ],
          edges: [
            edge("e1", "clock", "tick", "world", "tick"),
            edge("e2", "clock", "tick", "actor", "tick"),
            edge("e3", "clock", "tick", "system", "tick"),
            edge("e4", "personality", "traits", "actor", "personality"),
            edge("e5", "personality", "traits", "agent", "personality"),
            edge("e6", "goal", "goals", "actor", "goals"),
            edge("e7", "goal", "goals", "agent", "goals"),
            edge("e8", "memory", "memory", "actor", "memory"),
            edge("e9", "memory", "memory", "agent", "memory"),
            edge("e10", "world", "state", "perception", "state"),
            edge("e11", "perception", "observation", "agent", "observation"),
            edge("e12", "agent", "action", "system", "actions"),
            edge("e13", "actor", "ref", "system", "actors"),
          ],
        },
      ],
    };

    const result = compile(project, registry());
    expect("plan" in result).toBe(true);
    if ("plan" in result) {
      expect(result.plan.clock.nodeId).toBe("clock");
      expect(result.plan.perception.length).toBe(1);
      expect(result.plan.agents.length).toBe(1);
      expect(result.plan.agents[0]?.graphRef).toBe("agent:agent");
      expect(result.plan.agents[0]?.actorRef).toBe("actor");
    }
  });
});

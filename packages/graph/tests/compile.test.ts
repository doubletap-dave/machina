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

const empty: MachinaProject = {
  schemaVersion: 1,
  id: "p",
  name: "Empty",
  entryGraphId: "g",
  presetRefs: [],
  graphs: [{ id: "g", nodes: [], edges: [] }],
};

function projectWith(
  nodes: ReturnType<typeof node>[],
  edges: ReturnType<typeof edge>[] = [],
): MachinaProject {
  return {
    ...empty,
    graphs: [{ id: "g", nodes, edges }],
  };
}

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

  it("rejects an actor with an empty name", () => {
    const result = compile(
      projectWith([
        node("clock", "control.clock", 1, { period: "month" }),
        node("actor", "entities.actor", 1, { name: "" }),
      ]),
      registry(),
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("This actor needs a name.");
      expect(result.errors[0]?.code).toBe("ACTOR_NAME");
      expect(result.errors[0]?.nodeId).toBe("actor");
    }
  });

  it("rejects a goal with an empty statement", () => {
    const result = compile(
      projectWith([
        node("clock", "control.clock", 1, { period: "month" }),
        node("goal", "cognition.goal", 1, { statement: "" }),
      ]),
      registry(),
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("This goal has no statement.");
      expect(result.errors[0]?.code).toBe("GOAL_STATEMENT");
      expect(result.errors[0]?.nodeId).toBe("goal");
    }
  });

  it("rejects a goal whose statement is only whitespace", () => {
    const result = compile(
      projectWith([
        node("clock", "control.clock", 1, { period: "month" }),
        node("goal", "cognition.goal", 1, { statement: "   " }),
      ]),
      registry(),
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]?.message).toBe("This goal has no statement.");
    }
  });

  it("resolves the agent packet from wired personality and goal", () => {
    const result = compile(
      projectWith(
        [
          node("clock", "control.clock", 1, { period: "month" }),
          node("actor", "entities.actor", 1, { name: "Ada" }),
          node("personality", "cognition.personality", 1, {
            aggression: 70,
            paranoia: 40,
            cooperation: 50,
            risk: 30,
          }),
          node("goal", "cognition.goal", 1, { statement: "Hold the canal" }),
          node("agent", "cognition.agent"),
          node("system", "systems.system"),
        ],
        [
          edge("e-tick-actor", "clock", "tick", "actor", "tick"),
          edge("e-tick-system", "clock", "tick", "system", "tick"),
          edge("e-traits-actor", "personality", "traits", "actor", "personality"),
          edge("e-traits-agent", "personality", "traits", "agent", "personality"),
          edge("e-goals-actor", "goal", "goals", "actor", "goals"),
          edge("e-goals-agent", "goal", "goals", "agent", "goals"),
          edge("e-ref", "actor", "ref", "system", "actors"),
        ],
      ),
      registry(),
    );
    expect("plan" in result).toBe(true);
    if ("plan" in result) {
      const packet = result.plan.agents[0]?.packet;
      expect(packet?.personality).toEqual(
        expect.objectContaining({ aggression: 70 }),
      );
      const goals = packet?.goals;
      if (Array.isArray(goals)) {
        expect(goals).toHaveLength(1);
        expect(goals[0]).toEqual(
          expect.objectContaining({ statement: "Hold the canal" }),
        );
      } else {
        expect(goals).toEqual(
          expect.objectContaining({ statement: "Hold the canal" }),
        );
      }
    }
  });
});

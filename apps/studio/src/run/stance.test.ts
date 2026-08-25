import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MachinaProject, ObservationPacket } from "@machina/core";
import { PossessPanel } from "./PossessPanel.tsx";
import { legalPossessTargets } from "./stance.ts";

function testProject(): MachinaProject {
  return {
    schemaVersion: 1,
    id: "p1",
    name: "Test",
    entryGraphId: "g1",
    presetRefs: [],
    graphs: [
      {
        id: "g1",
        nodes: [
          {
            id: "agent-a",
            kind: "cognition.agent",
            version: 1,
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "agent-b",
            kind: "cognition.agent",
            version: 1,
            position: { x: 100, y: 0 },
            config: {},
          },
          {
            id: "nation",
            kind: "entities.actor",
            version: 1,
            position: { x: 200, y: 0 },
            config: {},
            subgraphId: "g2",
          },
        ],
        edges: [],
      },
      {
        id: "g2",
        parentGraphId: "g1",
        parentNodeId: "nation",
        nodes: [
          {
            id: "cabinet-a",
            kind: "cognition.agent",
            version: 1,
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "cabinet-b",
            kind: "cognition.agent",
            version: 1,
            position: { x: 100, y: 0 },
            config: {},
          },
        ],
        edges: [],
      },
    ],
  };
}

const samplePacket: ObservationPacket = {
  actorId: "agent-a",
  turn: 1,
  observations: [{ attribute: "enemy.economy", value: 42, confidence: 0.5, ageTurns: 0, source: "osint" }],
  memory: { chainOfThought: "secret reasoning" },
  goals: null,
  personality: null,
  legalActions: ["wait", "signal"],
};

describe("legalPossessTargets", () => {
  it("returns the agent id when a cognition.agent is selected", () => {
    const project = testProject();
    expect(legalPossessTargets(project, "agent-a")).toEqual(["agent-a"]);
  });

  it("returns all agents in a container subgraph", () => {
    const project = testProject();
    expect(legalPossessTargets(project, "nation")).toEqual(["cabinet-a", "cabinet-b"]);
  });

  it("returns all agent ids when selection is null", () => {
    const project = testProject();
    expect(legalPossessTargets(project, null)).toEqual(["agent-a", "agent-b", "cabinet-a", "cabinet-b"]);
  });
});

describe("PossessPanel", () => {
  it("renders legal actions as buttons without chain-of-thought", () => {
    render(createElement(PossessPanel, { packet: samplePacket }));

    expect(screen.getByRole("button", { name: "wait" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "signal" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("chainOfThought");
  });
});

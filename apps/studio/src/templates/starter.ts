import type { MachinaProject } from "@machina/core";

export function starterProject(): MachinaProject {
  const entryGraphId = "entry";
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: "New World",
    entryGraphId,
    presetRefs: [],
    graphs: [
      {
        id: entryGraphId,
        nodes: [
          {
            id: "clock",
            kind: "control.clock",
            version: 1,
            position: { x: 40, y: 40 },
            config: { period: "month" },
          },
          {
            id: "world",
            kind: "entities.world",
            version: 1,
            position: { x: 40, y: 160 },
            config: {},
          },
          {
            id: "logger",
            kind: "analysis.logger",
            version: 1,
            position: { x: 360, y: 160 },
            config: {},
          },
          {
            id: "inspector",
            kind: "analysis.inspector",
            version: 1,
            position: { x: 360, y: 40 },
            config: {},
          },
        ],
        edges: [
          {
            id: "clock-world",
            sourceNode: "clock",
            sourcePort: "tick",
            targetNode: "world",
            targetPort: "tick",
          },
          {
            id: "world-inspector",
            sourceNode: "world",
            sourcePort: "state",
            targetNode: "inspector",
            targetPort: "state",
          },
        ],
      },
    ],
  };
}

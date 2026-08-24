import type { NodeRegistry } from "@machina/node-sdk";
import { inspectorKind, loggerKind } from "./analysis.ts";
import { agentKind, goalKind, memoryKind, personalityKind } from "./cognition.ts";
import { clockKind, eventKind } from "./control.ts";
import { actorKind, resourceKind, worldKind } from "./entities.ts";
import { perceptionKind } from "./perception.ts";
import { relationshipKind, systemKind } from "./systems.ts";

const coreKinds = [
  worldKind,
  actorKind,
  resourceKind,
  agentKind,
  personalityKind,
  goalKind,
  memoryKind,
  perceptionKind,
  systemKind,
  relationshipKind,
  clockKind,
  eventKind,
  inspectorKind,
  loggerKind,
] as const;

export function registerCoreKinds(registry: NodeRegistry): void {
  for (const kind of coreKinds) {
    registry.register(kind);
  }
}

export {
  worldKind,
  actorKind,
  resourceKind,
  agentKind,
  personalityKind,
  goalKind,
  memoryKind,
  perceptionKind,
  systemKind,
  relationshipKind,
  clockKind,
  eventKind,
  inspectorKind,
  loggerKind,
};

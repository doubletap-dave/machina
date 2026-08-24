export type { PortType, Cardinality, PortDef } from "./ports.ts";
export type { MachinaError } from "./errors.ts";
export { machinaError } from "./errors.ts";
export { matchPorts } from "./match-ports.ts";
export type {
  MachinaProject,
  GraphDocument,
  MachinaNode,
  MachinaEdge,
  Wire,
} from "./ir.ts";
export { stripPositions } from "./ir.ts";
export type { SimulationPlan } from "./plan.ts";
export type { ObservationPacket, AgentAction } from "./packets.ts";
export type { MachinaEvent } from "./events.ts";

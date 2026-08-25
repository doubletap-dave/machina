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
export type { InstrumentMsg } from "./instrument.ts";
export type { KindFieldType, KindField, KindManifest } from "./kind-manifest.ts";
export { canonicalKindJson, kindHash } from "./kind-hash.ts";
export {
  kindNoRuntimeCopy,
  kindPinMismatchCopy,
  kindUnpinnedFileCopy,
  kindPinMissingFileCopy,
  kindIdReservedCopy,
} from "./kind-english.ts";
export {
  keyRefusedCopy,
  providerUnreachableCopy,
  illegalModelActionCopy,
  agentLlmIncompleteCopy,
  credentialsUnreadableCopy,
  noDefaultModelCopy,
  describeNoLlmCopy,
} from "./llm-english.ts";

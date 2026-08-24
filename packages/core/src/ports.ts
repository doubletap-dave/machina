export type PortType =
  | "ACTOR_REF"
  | "WORLD_STATE"
  | "OBSERVATION"
  | "ACTION"
  | "EVENT"
  | "RESOURCE"
  | "MESSAGE"
  | "RELATIONSHIP"
  | "MEMORY"
  | "SIGNAL"
  | "CLOCK"
  | "PERSONALITY"
  | "GOAL";

export type Cardinality = "exclusive" | "fan-in" | "fan-out";

export type PortDef = {
  name: string;
  dir: "in" | "out";
  type: PortType;
  cardinality: Cardinality;
  label: string;
};

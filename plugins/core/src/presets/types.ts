import type { GraphDocument } from "@machina/core";

export type Preset = {
  id: string;
  name: string;
  category: string;
  builtin: boolean;
  graph: GraphDocument;
  extraGraphs: GraphDocument[];
};

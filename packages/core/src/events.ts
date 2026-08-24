export type MachinaEvent = {
  id: string;
  turn: number;
  kind: string;
  nodeId?: string;
  payload: unknown;
};

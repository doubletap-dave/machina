export type GodView = {
  turn: number;
  actors: Record<string, { name: string; resources: Record<string, number> }>;
};

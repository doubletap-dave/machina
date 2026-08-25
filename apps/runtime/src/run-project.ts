import { openEngine } from "@machina/engine";
import type { ThinkFn } from "@machina/simulation";

export type RunProjectDeps = {
  think?: ThinkFn;
  openEngine?: typeof openEngine;
};

export async function runProjectHeadless(
  dir: string,
  turns: number,
  deps: RunProjectDeps = {},
): Promise<number> {
  const open = deps.openEngine ?? openEngine;
  const engine = await open(dir, { think: deps.think });
  const run = await engine.start({ seed: 7 });
  for (let index = 0; index < turns; index += 1) {
    await run.step();
  }
  return run.getSummary().turn;
}

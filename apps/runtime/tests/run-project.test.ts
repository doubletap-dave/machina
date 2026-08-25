import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import type { ThinkFn } from "@machina/simulation";
import { runProjectHeadless } from "../src/run-project.ts";

const projectDir = resolve(import.meta.dirname, "../../../examples/dead-channel-lite");

const waitThink: ThinkFn = async ({ packet }) => ({
  actorId: packet.actorId,
  type: "wait",
  params: {},
});

describe("runProjectHeadless", () => {
  it("errors without an injected think", async () => {
    await expect(runProjectHeadless(projectDir, 1)).rejects.toThrow(
      "No language model is configured. Possess the agent or set an API key.",
    );
  });

  it("runs dead channel lite for 20 turns", async () => {
    const turn = await runProjectHeadless(projectDir, 20, { think: waitThink });
    expect(turn).toBe(20);
  });
});

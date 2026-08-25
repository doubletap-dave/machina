import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ObservationPacket } from "@machina/core";
import { compile } from "@machina/graph";
import { createRegistry } from "@machina/node-sdk";
import { loadProject } from "@machina/persistence";
import { registerCoreKinds } from "@machina/plugin-core";
import { actorIdsFromPlan, createKernelFromPlan } from "@machina/simulation";

const projectDir = resolve(import.meta.dirname, "../../../examples/dead-channel-lite");

function registry() {
  const reg = createRegistry();
  registerCoreKinds(reg);
  return reg;
}

async function grepDeadChannelHacks(): Promise<string[]> {
  const roots = [
    resolve(import.meta.dirname, "../../../packages"),
    resolve(import.meta.dirname, "../../../apps/studio"),
  ];
  const matches: string[] = [];
  const pattern = /dead-channel/i;

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        if (full.replaceAll("\\", "/").endsWith("packages/engine/tests")) continue;
        await walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
      const text = await readFile(full, "utf-8");
      if (pattern.test(text)) {
        matches.push(full);
      }
    }
  }

  for (const root of roots) {
    await walk(root);
  }
  return matches;
}

describe("Dead Channel Lite", () => {
  it("loadProject + compile returns a plan", async () => {
    const project = await loadProject(projectDir);
    const result = compile(project, registry());
    expect("plan" in result).toBe(true);
    if ("plan" in result) {
      expect(result.plan.agents).toHaveLength(4);
      expect(result.plan.analysis.some((a) => a.kind === "analysis.logger")).toBe(
        true,
      );
      expect(
        result.plan.analysis.some((a) => a.kind === "analysis.inspector"),
      ).toBe(true);
    }
  });

  it("runs 20 turns without leaking truth into packets", async () => {
    const project = await loadProject(projectDir);
    const result = compile(project, registry());
    expect("plan" in result).toBe(true);
    if (!("plan" in result)) return;

    const actorIds = actorIdsFromPlan(result.plan);
    expect(actorIds).toContain("atlantic-federation");
    expect(actorIds).toContain("vesper-union");

    const seen: ObservationPacket[] = [];
    const kernel = createKernelFromPlan(result.plan, {
      seed: 7,
      think: async ({ packet }) => {
        seen.push(packet);
        return { actorId: packet.actorId, type: "wait", params: {} };
      },
    });

    for (let i = 0; i < 20; i++) {
      await kernel.runTurn();
    }

    expect(seen.length).toBeGreaterThan(0);
    const truth = kernel.getTruth();

    for (const packet of seen) {
      expect(packet).not.toHaveProperty("truth");
      expect(JSON.stringify(packet)).not.toContain("TrueWorldState");
      expect(packet.legalActions.length).toBeGreaterThan(0);
      for (const obs of packet.observations) {
        expect(obs).not.toHaveProperty("truth");
      }
    }

    expect(truth.turn).toBe(20);
  });

  it("has no dead-channel scenario hacks in engine or studio", async () => {
    const matches = await grepDeadChannelHacks();
    expect(matches).toEqual([]);
  });
});

#!/usr/bin/env node
import type { MachinaProject } from "@machina/core";
import type { ThinkFn } from "@machina/simulation";
import { runProjectHeadless } from "./run-project.ts";

export type CliDeps = {
  loadProject?: (dir: string) => Promise<MachinaProject>;
  step?: (runId: string) => Promise<{ turn: number }>;
  runHeadless?: (dir: string, turns: number) => Promise<number>;
  think?: ThinkFn;
  log?: (line: string) => void;
};

export async function runCli(
  argv: string[],
  deps: CliDeps = {},
): Promise<string> {
  const log = deps.log ?? ((line: string) => console.log(line));
  const lines: string[] = [];
  const write = (line: string) => {
    lines.push(line);
    log(line);
  };

  const [command, ...rest] = argv;
  if (command === "test") {
    write("ok");
    return lines.join("\n");
  }

  if (command === "run") {
    const dir = rest[0];
    if (!dir) {
      throw new Error("Usage: machina run <dir> --turns <n>");
    }
    const turnsIndex = rest.indexOf("--turns");
    const turns = turnsIndex >= 0 ? Number(rest[turnsIndex + 1]) : 1;
    if (!Number.isFinite(turns) || turns < 1) {
      throw new Error("Usage: machina run <dir> --turns <n>");
    }

    if (deps.runHeadless) {
      const finalTurn = await deps.runHeadless(dir, turns);
      write(`turns=${finalTurn}`);
      return lines.join("\n");
    }

    if (deps.loadProject && deps.step) {
      await deps.loadProject(dir);
      const runId = "cli";
      for (let index = 0; index < turns; index += 1) {
        await deps.step(runId);
      }
      write(`turns=${turns}`);
      return lines.join("\n");
    }

    const finalTurn = await runProjectHeadless(dir, turns, {
      think: deps.think,
    });
    write(`turns=${finalTurn}`);
    return lines.join("\n");
  }

  throw new Error(`Unknown command: ${command ?? ""}`);
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"));

if (isMain) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

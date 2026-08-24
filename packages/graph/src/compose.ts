import type { MachinaError, MachinaProject } from "@machina/core";
import type { NodeRegistry } from "@machina/node-sdk";
import { machinaError } from "@machina/core";
import { compile } from "./compile.ts";

export type ComposeProposer = (
  prompt: string,
  kinds: string[],
) => Promise<MachinaProject>;

export async function composeFromDescription(
  prompt: string,
  registry: NodeRegistry,
  proposer: ComposeProposer,
  smoke: (project: MachinaProject) => Promise<{ ok: boolean; message?: string }>,
  maxRepairs = 3,
): Promise<{ project: MachinaProject } | { errors: MachinaError[] }> {
  const kinds = registry.list().map((def) => def.type);
  let lastErrors: MachinaError[] = [];

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const project = await proposer(prompt, kinds);
    const compiled = compile(project, registry);

    if ("errors" in compiled) {
      lastErrors = compiled.errors;
      continue;
    }

    const smokeResult = await smoke(project);
    if (!smokeResult.ok) {
      lastErrors = [
        machinaError(
          "SMOKE_FAILED",
          smokeResult.message ?? "Smoke test failed.",
        ),
      ];
      continue;
    }

    return { project };
  }

  return { errors: lastErrors };
}

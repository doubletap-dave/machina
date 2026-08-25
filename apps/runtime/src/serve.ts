import type { KindManifest, MachinaProject } from "@machina/core";
import { compile } from "@machina/graph";
import { openEngineFromProject } from "@machina/engine";
import { loadProject } from "@machina/persistence";
import { createRegistry, kindManifestToDefinition } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { resolve } from "node:path";
import { createApp } from "./app.ts";

function compileWithKinds(project: MachinaProject, kinds: KindManifest[] = []) {
  const registry = createRegistry();
  registerCoreKinds(registry);
  for (const kind of kinds) {
    registry.register(kindManifestToDefinition(kind));
  }
  const result = compile(project, registry);
  if ("errors" in result) {
    return { errors: result.errors };
  }
  return { errors: [] as [], plan: result.plan };
}

const exampleDir = resolve(import.meta.dirname, "../../../examples/dead-channel-lite");
const port = Number(process.env.MACHINA_RUNTIME_PORT ?? process.env.PORT ?? 4000);

const app = createApp({
  compile: compileWithKinds,
  openEngineFromProject,
  loadExampleProject: () => loadProject(exampleDir),
});

app.listen(port, () => {
  console.log(`Machina runtime ready on http://localhost:${port}`);
});

app.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Kill the old process (netstat -ano | findstr :${port}) or set MACHINA_RUNTIME_PORT.`,
    );
    process.exit(1);
  }
  throw error;
});

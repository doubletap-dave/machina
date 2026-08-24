import { compile } from "@machina/graph";
import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";
import { createApp } from "./app.ts";

const registry = createRegistry();
registerCoreKinds(registry);

const port = Number(process.env.MACHINA_RUNTIME_PORT ?? process.env.PORT ?? 4000);

const app = createApp({
  compile(project) {
    const result = compile(project, registry);
    if ("errors" in result) {
      return { errors: result.errors };
    }
    return { errors: [], plan: result.plan };
  },
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

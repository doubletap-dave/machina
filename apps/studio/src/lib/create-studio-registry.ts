import { createRegistry } from "@machina/node-sdk";
import { registerCoreKinds } from "@machina/plugin-core";

export function createStudioRegistry() {
  const registry = createRegistry();
  registerCoreKinds(registry);
  return registry;
}

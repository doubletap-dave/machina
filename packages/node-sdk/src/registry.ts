import type { NodeDefinition } from "./define-node.ts";

function registryKey(type: string, version: number): string {
  return `${type}@${version}`;
}

export class NodeRegistry {
  private readonly defs = new Map<string, NodeDefinition>();

  register(def: NodeDefinition): void {
    this.defs.set(registryKey(def.type, def.version), def);
  }

  get(type: string, version?: number): NodeDefinition | undefined {
    if (version !== undefined) {
      return this.defs.get(registryKey(type, version));
    }
    const matches = [...this.defs.entries()]
      .filter(([key]) => key.startsWith(`${type}@`))
      .sort(([a], [b]) => {
        const vA = Number(a.split("@")[1]);
        const vB = Number(b.split("@")[1]);
        return vB - vA;
      });
    return matches[0]?.[1];
  }

  getOrThrow(type: string, version: number): NodeDefinition {
    const def = this.get(type, version);
    if (!def) {
      const anyVersion = this.get(type);
      if (anyVersion) {
        throw new Error("This node needs an update.");
      }
      throw new Error(`Machina doesn't know a node called ${type}.`);
    }
    return def;
  }

  list(): NodeDefinition[] {
    return [...this.defs.values()];
  }
}

export function createRegistry(): NodeRegistry {
  return new NodeRegistry();
}

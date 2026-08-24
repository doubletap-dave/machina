"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { NodeRegistry } from "@machina/node-sdk";
import { createProjectStore, type ProjectStore } from "./project-store.ts";

const ProjectStoreContext = createContext<ProjectStore | null>(null);
const RegistryContext = createContext<NodeRegistry | null>(null);

type ProviderProps = {
  registry: NodeRegistry;
  children: ReactNode;
};

export function ProjectStoreProvider({ registry, children }: ProviderProps) {
  const store = useMemo(() => createProjectStore(registry), [registry]);

  return (
    <RegistryContext.Provider value={registry}>
      <ProjectStoreContext.Provider value={store}>{children}</ProjectStoreContext.Provider>
    </RegistryContext.Provider>
  );
}

export function useProjectStore(): ProjectStore {
  const store = useContext(ProjectStoreContext);
  if (!store) {
    throw new Error("useProjectStore must be used within ProjectStoreProvider");
  }
  return store;
}

export function useRegistry(): NodeRegistry {
  const registry = useContext(RegistryContext);
  if (!registry) {
    throw new Error("useRegistry must be used within ProjectStoreProvider");
  }
  return registry;
}

export function useProjectSnapshot(): ProjectStore {
  const store = useProjectStore();
  useSyncExternalStore(store.subscribe, store.getRevision, store.getRevision);
  return store;
}

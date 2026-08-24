"use client";

import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { StudioShell } from "@/components/StudioShell";

const registry = createStudioRegistry();

export default function HomePage() {
  return (
    <ProjectStoreProvider registry={registry}>
      <StudioShell />
    </ProjectStoreProvider>
  );
}

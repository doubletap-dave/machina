import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kindIdReservedCopy } from "@machina/ui";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider, useProjectSnapshot } from "@/lib/project-store-context";
import { Inspector } from "@/components/Inspector";
import { Library } from "@/components/Library";
import { KindAuthorForm } from "./KindAuthorForm";

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    getSettings: vi.fn().mockResolvedValue({ default: null, providers: {} }),
  }),
}));

vi.mock("@/kinds/kind-library-client", () => ({
  browserKindLibrary: undefined,
}));

afterEach(() => {
  cleanup();
});

function AuthoringSurface() {
  return (
    <ProjectStoreProvider registry={createStudioRegistry()}>
      <Library onAddKind={() => {}} onInsertPreset={() => {}} onLoadTemplate={() => {}} />
      <Inspector />
    </ProjectStoreProvider>
  );
}

describe("Kind author form", () => {
  it("opens from New kind even when nothing is selected", async () => {
    const user = userEvent.setup();
    render(<AuthoringSurface />);

    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New kind" }));
    expect(screen.getByLabelText("Id")).toBeInTheDocument();
    expect(screen.queryByText("Select a node to inspect it.")).not.toBeInTheDocument();
  });

  it("cannot save a reserved id", async () => {
    const user = userEvent.setup();
    render(<AuthoringSurface />);

    await user.click(screen.getByRole("button", { name: "New kind" }));
    await user.clear(screen.getByLabelText("Id"));
    await user.type(screen.getByLabelText("Id"), "entities.actor");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Actor copy");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(kindIdReservedCopy())).toBeInTheDocument();
  });

  it("lists custom.radio-desk under Systems after save", async () => {
    const user = userEvent.setup();
    render(<AuthoringSurface />);

    await user.click(screen.getByRole("button", { name: "New kind" }));
    await user.clear(screen.getByLabelText("Id"));
    await user.type(screen.getByLabelText("Id"), "custom.radio-desk");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Radio desk");
    await user.selectOptions(screen.getByLabelText("Category"), "Systems");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const systems = screen.getByRole("heading", { name: "Systems" }).closest("section");
    expect(systems).not.toBeNull();
    expect(within(systems!).getByRole("button", { name: "Radio desk" })).toBeInTheDocument();
  });

  it("asks to replace an existing library copy before publishing", async () => {
    const publishKind = vi.fn(async (_manifest, opts?: { overwrite?: boolean }) =>
      opts?.overwrite ? "ok" : "confirm",
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <KindAuthorForm library={{ publishKind }} />
      </ProjectStoreProvider>,
    );
    await user.clear(screen.getByLabelText("Id"));
    await user.type(screen.getByLabelText("Id"), "custom.radio-desk");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Radio desk");
    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(confirm).toHaveBeenCalledWith("Replace the library copy of this kind?");
    expect(publishKind).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "custom.radio-desk" }),
      { overwrite: true },
    );
    confirm.mockRestore();
  });
});

function SeededManifestInspector() {
  const store = useProjectSnapshot();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    void store
      .upsertKind({
        schemaVersion: 1,
        id: "custom.radio-desk",
        version: 1,
        name: "Radio desk",
        category: "Systems",
        cardColor: "#aabbcc",
        ports: {},
        fields: [
          { key: "label", label: "Label", type: "string", default: "desk" },
          { key: "count", label: "Count", type: "number", default: 3 },
          { key: "live", label: "Live", type: "boolean", default: true },
          { key: "band", label: "Band", type: "enum", options: ["am", "fm"], default: "fm" },
        ],
      })
      .then(() => {
        const node = store.addNode("custom.radio-desk", { x: 0, y: 0 });
        store.selectNode(node.id);
        setReady(true);
      });
  }, [store]);

  if (!ready) {
    return null;
  }
  return <Inspector />;
}

describe("Inspector manifest fields", () => {
  it("generates inputs from KindField for a project kind", async () => {
    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <SeededManifestInspector />
      </ProjectStoreProvider>,
    );

    expect(await screen.findByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Count")).toBeInTheDocument();
    expect(screen.getByLabelText("Live")).toBeInTheDocument();
    expect(screen.getByLabelText("Band")).toBeInTheDocument();
  });
});

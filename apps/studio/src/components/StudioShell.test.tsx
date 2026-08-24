import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { Library } from "./Library";

describe("StudioShell library", () => {
  it("shows human names and adds a node when clicked", async () => {
    const user = userEvent.setup();
    let addedKind = "";

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <Library
          onAddKind={(kind) => {
            addedKind = kind;
          }}
        />
      </ProjectStoreProvider>,
    );

    expect(screen.getByText("Personality")).toBeInTheDocument();
    expect(screen.queryByText("cognition.personality")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Personality" }));
    expect(addedKind).toBe("cognition.personality");
  });
});

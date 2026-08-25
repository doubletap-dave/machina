import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { Library } from "./Library";
import { StudioShell } from "./StudioShell";

vi.mock("./Canvas", () => ({
  CanvasProvider: () => null,
  findNodeById: () => undefined,
}));

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    compile: vi.fn(),
    startRun: vi.fn(),
    step: vi.fn(),
    pause: vi.fn(),
    rewind: vi.fn(),
    setStance: vi.fn(),
    submitAction: vi.fn(),
    getRun: vi.fn(),
    loadExampleWorld: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({
      default: null,
      providers: {
        anthropic: { configured: false, verified: false, last4: "", models: [] },
        openai: { configured: false, verified: false, last4: "", models: [] },
        openrouter: { configured: false, verified: false, last4: "", models: [] },
        perplexity: { configured: false, verified: false, last4: "", models: [] },
      },
    }),
    subscribe: () => () => {},
  }),
}));

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
          onInsertPreset={() => {}}
          onLoadTemplate={() => {}}
        />
      </ProjectStoreProvider>,
    );

    expect(screen.getByText("Personality")).toBeInTheDocument();
    expect(screen.getByText("Atlantic Federation")).toBeInTheDocument();
    expect(screen.getByText("Behavior")).toBeInTheDocument();
    expect(screen.queryByText("Cognition")).not.toBeInTheDocument();
    expect(screen.queryByText("Library")).not.toBeInTheDocument();
    expect(screen.queryByText("cognition.personality")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New world" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Example world" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading").map((el) => el.textContent)).toEqual([
      "Presets",
      "Templates",
      "Actors",
      "World",
      "Behavior",
      "Systems",
      "Output",
    ]);

    await user.click(screen.getByRole("button", { name: "Personality" }));
    expect(addedKind).toBe("cognition.personality");
  });
});

function renderShell() {
  return render(
    <ProjectStoreProvider registry={createStudioRegistry()}>
      <StudioShell />
    </ProjectStoreProvider>,
  );
}

describe("StudioShell chrome", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses sentence-case Build Run Analyze Configure", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Run$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure" })).toBeInTheDocument();
  });

  it("opens the configuration page from Configure", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Configure" }));
    expect(await screen.findByRole("heading", { name: "Anthropic" })).toBeInTheDocument();
  });

  it("shows a status bar with skip animations", () => {
    renderShell();
    const bar = screen.getByRole("contentinfo");
    expect(within(bar).getByText("Turn 0")).toBeInTheDocument();
    expect(within(bar).getByText("Events 0")).toBeInTheDocument();
    expect(within(bar).getByText("Cost $0")).toBeInTheDocument();
    expect(within(bar).getByText("Errors 0")).toBeInTheDocument();
    expect(within(bar).getByRole("checkbox", { name: "Skip animations" })).toBeInTheDocument();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { Library } from "./Library";
import { StudioShell } from "./StudioShell";

vi.mock("./Canvas", () => ({
  CanvasProvider: () => <div data-testid="studio-canvas" />,
  findNodeById: () => undefined,
}));

const { compile, startRun, pause, setStance, getTruth, applyIntervention } = vi.hoisted(
  () => ({
    compile: vi.fn(),
    startRun: vi.fn(),
    pause: vi.fn(),
    setStance: vi.fn(),
    getTruth: vi.fn(),
    applyIntervention: vi.fn(),
  }),
);

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    compile,
    startRun,
    step: vi.fn(),
    pause,
    rewind: vi.fn(),
    setStance,
    submitAction: vi.fn(),
    getRun: vi.fn(),
    getTruth,
    applyIntervention,
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

vi.mock("@/kinds/kind-library-client", () => ({
  browserKindLibrary: undefined,
}));

describe("StudioShell library", () => {
  afterEach(() => {
    cleanup();
  });

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
    expect(screen.getByRole("button", { name: "New kind" })).toBeInTheDocument();
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

  it("marks kind buttons draggable for the canvas drop payload", () => {
    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <Library onAddKind={() => {}} onInsertPreset={() => {}} onLoadTemplate={() => {}} />
      </ProjectStoreProvider>,
    );

    expect(screen.getByRole("button", { name: "Personality" })).toHaveAttribute("draggable", "true");
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

  beforeEach(() => {
    compile.mockReset();
    startRun.mockReset();
    pause.mockReset();
    setStance.mockReset();
    getTruth.mockReset();
    applyIntervention.mockReset();
    compile.mockResolvedValue({ ok: true, plan: {} });
    startRun.mockResolvedValue({ id: "run-1" });
    pause.mockResolvedValue(undefined);
    setStance.mockResolvedValue(undefined);
    getTruth.mockResolvedValue({ turn: 0, actors: {} });
    applyIntervention.mockResolvedValue(undefined);
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
    const main = screen.getByRole("main");
    expect(within(main).getByLabelText("Theme")).toBeInTheDocument();
    expect(within(main).getByRole("checkbox", { name: "Skip animations" })).toBeInTheDocument();
  });

  it("shows Watch God Possess in the header with Watch pressed", () => {
    renderShell();
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("button", { name: "Watch" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "God" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Possess" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Watch" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a telemetry footer without appearance controls", () => {
    renderShell();
    const bar = screen.getByRole("contentinfo");
    expect(within(bar).getByText("Turn 0")).toBeInTheDocument();
    expect(within(bar).getByText("Events 0")).toBeInTheDocument();
    expect(within(bar).getByText("Cost $0")).toBeInTheDocument();
    expect(within(bar).getByText("Errors 0")).toBeInTheDocument();
    expect(within(bar).queryByRole("checkbox", { name: "Skip animations" })).not.toBeInTheDocument();
    expect(within(bar).queryByLabelText("Theme")).not.toBeInTheDocument();
    expect(within(bar).queryByLabelText("UI font")).not.toBeInTheDocument();
    expect(within(bar).queryByLabelText("Mono font")).not.toBeInTheDocument();
  });

  it("keeps the canvas on Analyze and Inspector on Build", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
  });

  it("keeps RunPanel mounted on Build so a started run survives the tab switch", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start run", hidden: true })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Run$/ }));
    await user.click(await screen.findByRole("button", { name: "Start run" }));
    expect(await screen.findByRole("button", { name: "Restart run" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Build" }));
    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart run", hidden: true })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Run$/ }));
    expect(screen.getByRole("button", { name: "Restart run" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start run" })).not.toBeInTheDocument();
  });

  it("refuses header Possess while a run is running unpaused", async () => {
    const user = userEvent.setup();
    renderShell();
    const header = screen.getByRole("banner");

    await user.click(screen.getByRole("button", { name: /^Run$/ }));
    await user.click(await screen.findByRole("button", { name: "Start run" }));
    expect(await screen.findByRole("button", { name: "Restart run" })).toBeInTheDocument();

    await user.click(within(header).getByRole("button", { name: "Possess" }));
    expect(screen.getByText("Pause a run to possess this actor.")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Watch" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(header).getByRole("button", { name: "Possess" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(within(header).getByRole("button", { name: "Possess" }));
    expect(within(header).getByRole("button", { name: "Possess" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

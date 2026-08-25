import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InstrumentMsg, ObservationPacket } from "@machina/core";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider, useProjectSnapshot } from "@/lib/project-store-context";
import { RunPanel } from "./RunPanel";

const { compile, startRun, pause, setStance, subscribe } = vi.hoisted(() => ({
  compile: vi.fn(),
  startRun: vi.fn(),
  pause: vi.fn(),
  setStance: vi.fn(),
  subscribe: vi.fn<(onMessage: (msg: InstrumentMsg) => void) => () => void>(),
}));

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
    loadExampleWorld: vi.fn(),
    subscribe,
  }),
}));

const packet: ObservationPacket = {
  actorId: "agent-1",
  turn: 1,
  observations: [
    { attribute: "enemy.economy", value: 50, confidence: 0.5, ageTurns: 0, source: "osint" },
  ],
  memory: null,
  goals: null,
  personality: null,
  legalActions: ["wait", "signal"],
};

type RunPanelHarnessProps = {
  onError: (message: string) => void;
  onPausedChange?: (paused: boolean) => void;
  possessRequest?: string | null;
  onPossessConsumed?: () => void;
};

function SeededRunPanel({
  onError,
  onPausedChange,
  possessRequest,
  onPossessConsumed,
}: RunPanelHarnessProps) {
  const store = useProjectSnapshot();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    store.addNode("cognition.agent", { x: 0, y: 0 });
    setReady(true);
  }, [store]);

  if (!ready) {
    return null;
  }

  return (
    <RunPanel
      onError={onError}
      onPausedChange={onPausedChange}
      possessRequest={possessRequest}
      onPossessConsumed={onPossessConsumed}
    />
  );
}

function renderRunPanel(
  onError: (message: string) => void = () => {},
  extras: Omit<RunPanelHarnessProps, "onError"> = {},
) {
  return render(
    <ProjectStoreProvider registry={createStudioRegistry()}>
      <SeededRunPanel onError={onError} {...extras} />
    </ProjectStoreProvider>,
  );
}

describe("RunPanel", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    subscribe.mockReset();
    subscribe.mockImplementation(() => () => {});
    compile.mockReset();
    startRun.mockReset();
    pause.mockReset();
    setStance.mockReset();
    compile.mockResolvedValue({ ok: true, plan: {} });
    startRun.mockResolvedValue({ id: "run-1" });
    pause.mockResolvedValue(undefined);
    setStance.mockResolvedValue(undefined);
  });

  it("hides possess-panel until a possess-wait packet arrives and never shows chainOfThought", async () => {
    const user = userEvent.setup();
    let onMessage: ((msg: InstrumentMsg) => void) | undefined;
    subscribe.mockImplementation((handler: (msg: InstrumentMsg) => void) => {
      onMessage = handler;
      return () => {};
    });

    renderRunPanel();

    const stance = await screen.findByRole("group", { name: "Run stance" });
    await user.click(within(stance).getByRole("button", { name: "possess" }));
    expect(screen.queryByTestId("possess-panel")).not.toBeInTheDocument();

    act(() => {
      onMessage?.({ type: "possess-wait", nodeId: "agent-1", packet });
    });

    expect(screen.getByTestId("possess-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "wait" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "signal" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("chainOfThought");
  });

  it("startRun sends the current stance and possessNodeId", async () => {
    const user = userEvent.setup();
    renderRunPanel();

    const stance = await screen.findByRole("group", { name: "Run stance" });
    await user.click(within(stance).getByRole("button", { name: "possess" }));
    await user.click(screen.getByRole("button", { name: "Start run" }));

    expect(startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        stance: "possess",
        possessNodeId: expect.any(String),
      }),
    );
    const body = startRun.mock.calls[0]?.[0] as { possessNodeId?: string };
    expect(body.possessNodeId?.length).toBeGreaterThan(0);
  });

  it("reports pause to onPausedChange", async () => {
    const user = userEvent.setup();
    const onPausedChange = vi.fn();
    renderRunPanel(() => {}, { onPausedChange });

    await user.click(await screen.findByRole("button", { name: "Start run" }));
    await user.click(await screen.findByRole("button", { name: "Pause" }));

    expect(onPausedChange).toHaveBeenCalledWith(true);
  });

  it("applies canvas possessRequest by setting possess stance", async () => {
    const user = userEvent.setup();

    function PossessRequestHarness() {
      const [request, setRequest] = useState<string | null>(null);
      return (
        <>
          <button type="button" onClick={() => setRequest("actor-1")}>
            Request possess
          </button>
          <SeededRunPanel
            onError={() => {}}
            possessRequest={request}
            onPossessConsumed={() => setRequest(null)}
          />
        </>
      );
    }

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <PossessRequestHarness />
      </ProjectStoreProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Start run" }));
    await user.click(screen.getByRole("button", { name: "Request possess" }));

    expect(setStance).toHaveBeenCalledWith("run-1", "possess", "actor-1");
    const stance = screen.getByRole("group", { name: "Run stance" });
    expect(within(stance).getByRole("button", { name: "possess" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

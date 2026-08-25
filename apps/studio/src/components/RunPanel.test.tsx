import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InstrumentMsg, ObservationPacket } from "@machina/core";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider, useProjectSnapshot } from "@/lib/project-store-context";
import { RunPanel } from "./RunPanel";

const { compile, startRun, subscribe } = vi.hoisted(() => ({
  compile: vi.fn(),
  startRun: vi.fn(),
  subscribe: vi.fn<(onMessage: (msg: InstrumentMsg) => void) => () => void>(),
}));

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    compile,
    startRun,
    step: vi.fn(),
    pause: vi.fn(),
    rewind: vi.fn(),
    setStance: vi.fn(),
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

function SeededRunPanel({ onError }: { onError: (message: string) => void }) {
  const store = useProjectSnapshot();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    store.addNode("cognition.agent", { x: 0, y: 0 });
    setReady(true);
  }, [store]);

  if (!ready) {
    return null;
  }

  return <RunPanel onError={onError} />;
}

function renderRunPanel(onError: (message: string) => void = () => {}) {
  return render(
    <ProjectStoreProvider registry={createStudioRegistry()}>
      <SeededRunPanel onError={onError} />
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
    compile.mockResolvedValue({ ok: true, plan: {} });
    startRun.mockResolvedValue({ id: "run-1" });
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
});

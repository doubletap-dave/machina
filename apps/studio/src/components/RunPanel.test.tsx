import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstrumentMsg, ObservationPacket } from "@machina/core";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider, useProjectSnapshot } from "@/lib/project-store-context";
import { RunPanel } from "./RunPanel";

const { subscribe } = vi.hoisted(() => ({
  subscribe: vi.fn<(onMessage: (msg: InstrumentMsg) => void) => () => void>(),
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
  beforeEach(() => {
    subscribe.mockReset();
    subscribe.mockImplementation(() => () => {});
  });

  it("hides possess-panel until a possess-wait packet arrives and never shows chainOfThought", async () => {
    const user = userEvent.setup();
    let onMessage: ((msg: InstrumentMsg) => void) | undefined;
    subscribe.mockImplementation((handler: (msg: InstrumentMsg) => void) => {
      onMessage = handler;
      return () => {};
    });

    renderRunPanel();

    await user.click(await screen.findByRole("button", { name: "possess" }));
    expect(screen.queryByTestId("possess-panel")).not.toBeInTheDocument();

    act(() => {
      onMessage?.({ type: "possess-wait", nodeId: "agent-1", packet });
    });

    expect(screen.getByTestId("possess-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "wait" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "signal" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("chainOfThought");
  });
});

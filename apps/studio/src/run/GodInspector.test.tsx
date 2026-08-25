import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GodInspector } from "./GodInspector";

const { getTruth, applyIntervention } = vi.hoisted(() => ({
  getTruth: vi.fn(),
  applyIntervention: vi.fn(),
}));

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    getTruth,
    applyIntervention,
  }),
}));

describe("GodInspector", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getTruth.mockReset();
    applyIntervention.mockReset();
    getTruth.mockResolvedValue({
      turn: 1,
      actors: { a: { name: "Ada", resources: { economy: 50 } } },
    });
    applyIntervention.mockResolvedValue(undefined);
  });

  it("edits economy and posts the intervention path with noticeable", async () => {
    const user = userEvent.setup();
    render(<GodInspector runId="run-1" />);

    const economy = await screen.findByRole("spinbutton", { name: /economy/i });
    expect(economy).toHaveValue(50);

    await user.clear(economy);
    await user.type(economy, "25");
    await user.click(screen.getByRole("checkbox", { name: "They can notice this" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(applyIntervention).toHaveBeenCalledWith("run-1", {
      path: "actors.a.resources.economy",
      value: 25,
      noticeable: true,
    });
  });
});

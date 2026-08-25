import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("posts only the one resource that differs from truth", async () => {
    const user = userEvent.setup();
    getTruth.mockResolvedValue({
      turn: 1,
      actors: {
        a: { name: "Ada", resources: { economy: 50 } },
        b: { name: "Bob", resources: { economy: 50 } },
      },
    });
    render(<GodInspector runId="run-1" />);

    const ada = await screen.findByRole("group", { name: "Ada" });
    const adaEconomy = within(ada).getByRole("spinbutton", { name: /economy/i });
    await user.clear(adaEconomy);
    await user.type(adaEconomy, "10");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(applyIntervention).toHaveBeenCalledTimes(1);
    expect(applyIntervention).toHaveBeenCalledWith("run-1", {
      path: "actors.a.resources.economy",
      value: 10,
      noticeable: false,
    });
  });

  it("disables Apply when more than one resource differs", async () => {
    const user = userEvent.setup();
    getTruth.mockResolvedValue({
      turn: 1,
      actors: {
        a: { name: "Ada", resources: { economy: 50 } },
        b: { name: "Bob", resources: { economy: 50 } },
      },
    });
    render(<GodInspector runId="run-1" />);

    const ada = await screen.findByRole("group", { name: "Ada" });
    const bob = screen.getByRole("group", { name: "Bob" });
    await user.clear(within(ada).getByRole("spinbutton", { name: /economy/i }));
    await user.type(within(ada).getByRole("spinbutton", { name: /economy/i }), "10");
    await user.clear(within(bob).getByRole("spinbutton", { name: /economy/i }));
    await user.type(within(bob).getByRole("spinbutton", { name: /economy/i }), "20");

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(applyIntervention).not.toHaveBeenCalled();
  });
});

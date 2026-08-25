import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { DescribePanel } from "./DescribePanel";

const { getSettings, compose } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  compose: vi.fn(),
}));

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    getSettings,
    compose,
    compile: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  getSettings.mockReset();
  compose.mockReset();
});

describe("DescribePanel", () => {
  it("errors in English when no language model is configured", async () => {
    getSettings.mockResolvedValue({ default: null, providers: {} });
    const user = userEvent.setup();
    const onError = vi.fn();

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <DescribePanel onError={onError} onSuccess={() => {}} />
      </ProjectStoreProvider>,
    );

    await user.type(screen.getByPlaceholderText(/two nations/i), "two nations with diplomacy");
    await user.click(screen.getByRole("button", { name: "Compose" }));

    expect(onError).toHaveBeenCalledWith(
      "No language model is configured. Build by hand or set an API key.",
    );
    expect(compose).not.toHaveBeenCalled();
  });

  it("posts compose with the prompt and current project when a default is set", async () => {
    getSettings.mockResolvedValue({
      default: { provider: "openai", model: "gpt-4o" },
      providers: {},
    });
    compose.mockResolvedValue({
      ok: true,
      project: {
        schemaVersion: 1,
        id: "composed",
        name: "Composed",
        entryGraphId: "g1",
        presetRefs: [],
        graphs: [{ id: "g1", nodes: [], edges: [] }],
      },
    });
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <DescribePanel onError={() => {}} onSuccess={onSuccess} />
      </ProjectStoreProvider>,
    );

    await user.type(screen.getByPlaceholderText(/two nations/i), "two nations with diplomacy");
    await user.click(screen.getByRole("button", { name: "Compose" }));

    expect(compose).toHaveBeenCalledTimes(1);
    const [prompt, project] = compose.mock.calls[0]!;
    expect(prompt).toBe("two nations with diplomacy");
    expect(project).toMatchObject({ schemaVersion: 1, graphs: expect.any(Array) });
    expect(onSuccess).toHaveBeenCalled();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import type { ProjectStore } from "@/lib/project-store";
import { ProjectStoreProvider, useProjectSnapshot } from "@/lib/project-store-context";
import { Inspector } from "./Inspector";

const { getSettings } = vi.hoisted(() => ({
  getSettings: vi.fn(),
}));

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    getSettings,
  }),
}));

afterEach(() => {
  cleanup();
  getSettings.mockReset();
});

function SeededAgentInspector() {
  const store = useProjectSnapshot();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const node = store.addNode("cognition.agent", { x: 0, y: 0 });
    store.selectNode(node.id);
    setReady(true);
  }, [store]);

  if (!ready) {
    return null;
  }
  return <Inspector />;
}

describe("Inspector agent LLM fields", () => {
  it("shows Use machine default as the first option and loads models from getSettings", async () => {
    getSettings.mockResolvedValue({
      default: { provider: "openai", model: "gpt-4o" },
      providers: {
        openai: {
          configured: true,
          verified: true,
          last4: "abcd",
          models: [
            { id: "gpt-4o", name: "GPT-4o" },
            { id: "gpt-4.1", name: "GPT-4.1" },
          ],
        },
      },
    });

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <SeededAgentInspector />
      </ProjectStoreProvider>,
    );

    const provider = await screen.findByLabelText("Language model provider");
    const providerOptions = [...provider.querySelectorAll("option")].map((option) =>
      option.textContent,
    );
    expect(providerOptions[0]).toBe("Use machine default");

    const model = screen.getByLabelText("Language model");
    const modelOptions = [...model.querySelectorAll("option")].map((option) => option.textContent);
    expect(modelOptions[0]).toBe("Use machine default");

    const user = userEvent.setup();
    await user.selectOptions(provider, "openai");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "GPT-4o" })).toBeInTheDocument();
    });
    expect(getSettings).toHaveBeenCalled();
  });

  it("writes llmProvider and llmModel onto the selected agent", async () => {
    getSettings.mockResolvedValue({
      default: null,
      providers: {
        openai: {
          configured: true,
          verified: true,
          last4: "abcd",
          models: [{ id: "gpt-4o", name: "GPT-4o" }],
        },
      },
    });

    let storeRef: ProjectStore | null = null;

    function Capture() {
      storeRef = useProjectSnapshot();
      return <SeededAgentInspector />;
    }

    render(
      <ProjectStoreProvider registry={createStudioRegistry()}>
        <Capture />
      </ProjectStoreProvider>,
    );

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Language model provider"), "openai");
    await user.selectOptions(await screen.findByLabelText("Language model"), "gpt-4o");

    const node = storeRef!.getCurrentGraph().nodes.find(
      (candidate) => candidate.kind === "cognition.agent",
    );
    expect(node?.config).toMatchObject({ llmProvider: "openai", llmModel: "gpt-4o" });
  });
});

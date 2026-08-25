import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { noDefaultModelCopy } from "@machina/core";
import type { PublicProviderSlice, SettingsModels } from "@machina/client";
import type { StudioPrefs } from "@/lib/studio-prefs";
import { ConfigurationPage } from "./ConfigurationPage";

const dummyPrefs: StudioPrefs = {
  schemaVersion: 1,
  theme: "machina",
  uiFont: "ibm-plex-sans",
  monoFont: "ibm-plex-mono",
};

function renderPage() {
  return render(
    <ConfigurationPage
      prefs={dummyPrefs}
      onChange={() => {}}
      skipAnimations={false}
      onSkipAnimations={() => {}}
    />,
  );
}

const emptySlice = (): PublicProviderSlice => ({
  configured: false,
  verified: false,
  last4: "",
  models: [],
});

function settings(overrides?: Partial<SettingsModels>): SettingsModels {
  return {
    default: null,
    providers: {
      anthropic: emptySlice(),
      openai: emptySlice(),
      openrouter: emptySlice(),
      perplexity: emptySlice(),
    },
    ...overrides,
  };
}

const { getSettings, putProviderKey, deleteProvider, refreshProvider, putDefault } = vi.hoisted(
  () => ({
    getSettings: vi.fn(),
    putProviderKey: vi.fn(),
    deleteProvider: vi.fn(),
    refreshProvider: vi.fn(),
    putDefault: vi.fn(),
  }),
);

vi.mock("@/lib/machina-client", () => ({
  getStudioClient: () => ({
    getSettings,
    putProviderKey,
    deleteProvider,
    refreshProvider,
    putDefault,
  }),
}));

afterEach(() => {
  cleanup();
  getSettings.mockReset();
  putProviderKey.mockReset();
  deleteProvider.mockReset();
  refreshProvider.mockReset();
  putDefault.mockReset();
  localStorage.clear();
});

describe("ConfigurationPage", () => {
  it("shows four provider panels and no-default copy", async () => {
    getSettings.mockResolvedValue(settings());
    renderPage();

    expect(await screen.findByRole("heading", { name: "Anthropic" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenRouter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Perplexity" })).toBeInTheDocument();
    expect(screen.getByText(noDefaultModelCopy())).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByLabelText("UI font")).toBeInTheDocument();
    expect(screen.getByLabelText("Mono font")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Skip animations" })).toBeInTheDocument();
  });

  it("shows the machine default as provider / model", async () => {
    getSettings.mockResolvedValue(
      settings({ default: { provider: "openai", model: "gpt-4o" } }),
    );
    renderPage();
    expect(await screen.findByText("openai / gpt-4o")).toBeInTheDocument();
  });

  it("saves, removes, and refreshes a provider key without writing localStorage", async () => {
    const anthropic: PublicProviderSlice = {
      configured: true,
      verified: true,
      last4: "abcd",
      models: [{ id: "claude-sonnet-4-5", name: "Claude Sonnet" }],
    };
    getSettings.mockResolvedValue(settings());
    putProviderKey.mockResolvedValue(anthropic);
    deleteProvider.mockResolvedValue(undefined);
    refreshProvider.mockResolvedValue(anthropic);

    const user = userEvent.setup();
    renderPage();
    const panel = await screen.findByRole("region", { name: "Anthropic" });

    await user.type(within(panel).getByLabelText("API key"), "sk-ant-secret-abcd");
    await user.click(within(panel).getByRole("button", { name: "Save" }));
    expect(putProviderKey).toHaveBeenCalledWith("anthropic", "sk-ant-secret-abcd");
    expect(JSON.stringify(localStorage)).not.toContain("sk-ant-secret-abcd");

    expect(await within(panel).findByText(/••••abcd/)).toBeInTheDocument();
    expect(within(panel).getByText("Verified")).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Refresh" }));
    expect(refreshProvider).toHaveBeenCalledWith("anthropic");

    await user.click(within(panel).getByRole("button", { name: "Remove" }));
    expect(deleteProvider).toHaveBeenCalledWith("anthropic");
  });

  it("filters models and sets the machine default", async () => {
    const anthropic: PublicProviderSlice = {
      configured: true,
      verified: true,
      last4: "abcd",
      models: [
        { id: "claude-sonnet-4-5", name: "Claude Sonnet" },
        { id: "claude-opus-4", name: "Claude Opus" },
      ],
    };
    getSettings.mockResolvedValue(
      settings({
        providers: {
          anthropic,
          openai: emptySlice(),
          openrouter: emptySlice(),
          perplexity: emptySlice(),
        },
      }),
    );
    putDefault.mockResolvedValue({
      default: { provider: "anthropic", model: "claude-sonnet-4-5" },
    });

    const user = userEvent.setup();
    renderPage();
    const panel = await screen.findByRole("region", { name: "Anthropic" });

    await user.type(within(panel).getByLabelText("Filter"), "sonnet");
    expect(within(panel).getByText("Claude Sonnet")).toBeInTheDocument();
    expect(within(panel).queryByText("Claude Opus")).not.toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: /Claude Sonnet/ }));
    await user.click(within(panel).getByRole("button", { name: "Set as default" }));
    expect(putDefault).toHaveBeenCalledWith({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
    });
  });
});

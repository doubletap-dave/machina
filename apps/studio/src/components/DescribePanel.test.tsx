import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { DescribePanel } from "./DescribePanel";

describe("DescribePanel", () => {
  it("errors in English when no language model is configured", async () => {
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
  });
});

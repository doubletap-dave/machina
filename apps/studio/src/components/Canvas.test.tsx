import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createStudioRegistry } from "@/lib/create-studio-registry";
import { ProjectStoreProvider } from "@/lib/project-store-context";
import { CanvasProvider } from "./Canvas";

beforeAll(() => {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

function renderCanvas() {
  return render(
    <ProjectStoreProvider registry={createStudioRegistry()}>
      <div style={{ width: 800, height: 600 }}>
        <CanvasProvider onEdgeError={() => {}} />
      </div>
    </ProjectStoreProvider>,
  );
}

describe("Canvas MiniMap", () => {
  it("renders a pannable minimap at 200 by 120", () => {
    const { container } = renderCanvas();
    const svg = container.querySelector(".react-flow__minimap-svg");

    expect(container.querySelector(".react-flow__minimap")).toBeTruthy();
    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "120");
  });
});

describe("Canvas background", () => {
  it("uses a dotted 16px background", () => {
    const { container } = renderCanvas();
    const dots = container.querySelector(".react-flow__background pattern circle");

    expect(dots).toBeTruthy();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import type { PortDef } from "@machina/core";
import { MachinaFlowNode } from "./MachinaFlowNode";

afterEach(() => {
  cleanup();
});

const observationIn: PortDef = {
  name: "obs",
  dir: "in",
  type: "OBSERVATION",
  cardinality: "fan-in",
  label: "Observation",
};

function renderFlowNode(ports: Record<string, PortDef>) {
  const props = {
    id: "node-1",
    data: { label: "Test node", ports },
    type: "machina",
    dragging: false,
    selected: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
  } as NodeProps;

  return render(
    <ReactFlowProvider>
      <MachinaFlowNode {...props} />
    </ReactFlowProvider>,
  );
}

describe("MachinaFlowNode handles", () => {
  it("marks an OBSERVATION in-port with data-port-type", () => {
    const { container } = renderFlowNode({ obs: observationIn });
    const handle = container.querySelector('[data-port-type="OBSERVATION"]');

    expect(handle).toBeTruthy();
    expect(handle).toHaveAttribute("title", "Observation");
    expect(handle).toHaveAttribute("aria-label", "Observation");
    expect(handle).toHaveStyle({ backgroundColor: "#4ec4d9", borderColor: "#4ec4d9" });
    expect(handle?.querySelector('[data-port-symbol="ring"]')).toBeTruthy();
    expect(screen.getByText("Observation")).toBeTruthy();
  });
});

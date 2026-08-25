import { describe, expect, it } from "vitest";
import { kindFromDrop, MACHINA_DND, setDragKind } from "./dnd.ts";

function mockDataTransfer() {
  const data = new Map<string, string>();
  return {
    effectAllowed: "none",
    setData(type: string, value: string) {
      data.set(type, value);
    },
    getData(type: string) {
      return data.get(type) ?? "";
    },
  };
}

describe("kind drag payload", () => {
  it("roundtrips a kind through setDragKind and kindFromDrop", () => {
    const dataTransfer = mockDataTransfer();
    setDragKind({ dataTransfer: dataTransfer as unknown as DataTransfer }, "cognition.agent");

    expect(dataTransfer.effectAllowed).toBe("move");
    expect(kindFromDrop({ dataTransfer: dataTransfer as unknown as DataTransfer })).toBe(
      "cognition.agent",
    );
    expect(MACHINA_DND).toBe("application/reactflow");
  });

  it("returns null when the MIME payload is empty", () => {
    const dataTransfer = mockDataTransfer();
    expect(kindFromDrop({ dataTransfer: dataTransfer as unknown as DataTransfer })).toBeNull();
  });
});

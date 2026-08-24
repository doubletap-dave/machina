import { describe, expect, it } from "vitest";
import { toWs } from "../src/instrumentation.ts";

describe("toWs", () => {
  it("maps turn instrumentation to WebSocket payload", () => {
    expect(toWs({ type: "turn", turn: 3 })).toEqual({ type: "turn", turn: 3 });
  });
});

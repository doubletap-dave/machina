import { describe, expect, it } from "vitest";
import type { InstrumentMsg as CoreExport } from "@machina/core";
import type { InstrumentMsg } from "../src/instrument.ts";
import * as instrument from "../src/instrument.ts";

describe("InstrumentMsg", () => {
  it("accepts possess-wait with a packet", () => {
    const msg: InstrumentMsg = {
      type: "possess-wait",
      nodeId: "agent-1",
      packet: {
        actorId: "actor-1",
        turn: 1,
        observations: [],
        memory: null,
        goals: null,
        personality: null,
        legalActions: ["wait"],
      },
    };
    expect(msg.type).toBe("possess-wait");
    expect(instrument).toBeTypeOf("object");
  });

  it("is exported from @machina/core", () => {
    const msg: CoreExport = {
      type: "error",
      message: "compile failed",
    };
    expect(msg.type).toBe("error");
  });
});

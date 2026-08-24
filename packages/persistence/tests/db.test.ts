import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../src/db.ts";

describe("PGlite persistence", () => {
  let dataDir: string;
  let db: Awaited<ReturnType<typeof createDb>>;

  beforeEach(async () => {
    dataDir = join(tmpdir(), `machina-db-${randomBytes(8).toString("hex")}`);
    db = await createDb(dataDir);
  });

  afterEach(async () => {
    await db.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("autosave then load", async () => {
    await db.autosave("p1", '{"foo":1}');
    expect(await db.loadAutosave("p1")).toBe('{"foo":1}');
  });

  it("insert run, append two events, listEvents length 2", async () => {
    await db.insertRun({
      id: "r1",
      projectId: "p1",
      seed: 42,
      createdAt: "2026-01-01",
    });
    await db.appendEvent("r1", '{"a":1}');
    await db.appendEvent("r1", '{"a":2}');
    const events = await db.listEvents("r1");
    expect(events).toHaveLength(2);
    expect(events[0]).toBe('{"a":1}');
    expect(events[1]).toBe('{"a":2}');
  });

  it("insertSnapshot turn 1, getSnapshot returns json", async () => {
    await db.insertSnapshot("r1", 1, '{"turn":1}');
    expect(await db.getSnapshot("r1", 1)).toBe('{"turn":1}');
  });
});

import { PGlite } from "@electric-sql/pglite";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import {
  autosaves,
  events,
  INIT_STATEMENTS,
  simulationRuns,
  worldSnapshots,
} from "./schema.ts";

export type RunRecord = {
  id: string;
  projectId: string;
  seed: number;
  createdAt: string;
};

export type MachinaDb = {
  autosave(projectId: string, json: string): Promise<void>;
  loadAutosave(projectId: string): Promise<string | null>;
  insertRun(run: RunRecord): Promise<void>;
  appendEvent(runId: string, eventJson: string): Promise<void>;
  listEvents(runId: string): Promise<string[]>;
  insertSnapshot(runId: string, turn: number, json: string): Promise<void>;
  getSnapshot(runId: string, turn: number): Promise<string | null>;
  close(): Promise<void>;
};

export async function createDb(dataDir: string): Promise<MachinaDb> {
  const client = new PGlite(dataDir);
  const db = drizzle(client);

  for (const statement of INIT_STATEMENTS) {
    await client.exec(statement);
  }

  return {
    async autosave(projectId: string, json: string): Promise<void> {
      await db
        .insert(autosaves)
        .values({ projectId, body: json })
        .onConflictDoUpdate({
          target: autosaves.projectId,
          set: { body: json },
        });
    },

    async loadAutosave(projectId: string): Promise<string | null> {
      const rows = await db
        .select({ body: autosaves.body })
        .from(autosaves)
        .where(eq(autosaves.projectId, projectId));
      return rows[0]?.body ?? null;
    },

    async insertRun(run: RunRecord): Promise<void> {
      await db.insert(simulationRuns).values({
        id: run.id,
        projectId: run.projectId,
        seed: run.seed,
        createdAt: run.createdAt,
      });
    },

    async appendEvent(runId: string, eventJson: string): Promise<void> {
      await db.insert(events).values({ runId, body: eventJson });
    },

    async listEvents(runId: string): Promise<string[]> {
      const rows = await db
        .select({ body: events.body })
        .from(events)
        .where(eq(events.runId, runId))
        .orderBy(asc(events.seq));
      return rows.map((row) => row.body);
    },

    async insertSnapshot(
      runId: string,
      turn: number,
      json: string,
    ): Promise<void> {
      await db.insert(worldSnapshots).values({ runId, turn, body: json });
    },

    async getSnapshot(runId: string, turn: number): Promise<string | null> {
      const rows = await db
        .select({ body: worldSnapshots.body })
        .from(worldSnapshots)
        .where(
          and(eq(worldSnapshots.runId, runId), eq(worldSnapshots.turn, turn)),
        );
      return rows[0]?.body ?? null;
    },

    async close(): Promise<void> {
      await client.close();
    },
  };
}

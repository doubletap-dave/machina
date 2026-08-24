import {
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";

export const autosaves = pgTable("autosaves", {
  projectId: text("project_id").primaryKey(),
  body: text("body").notNull(),
});

export const simulationRuns = pgTable("simulation_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  seed: integer("seed").notNull(),
  createdAt: text("created_at").notNull(),
});

export const events = pgTable("events", {
  runId: text("run_id").notNull(),
  seq: serial("seq").notNull(),
  body: text("body").notNull(),
});

export const worldSnapshots = pgTable(
  "world_snapshots",
  {
    runId: text("run_id").notNull(),
    turn: integer("turn").notNull(),
    body: text("body").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.runId, table.turn] }),
  }),
);

export const INIT_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS autosaves (
    project_id text PRIMARY KEY,
    body text
  )`,
  `CREATE TABLE IF NOT EXISTS simulation_runs (
    id text PRIMARY KEY,
    project_id text,
    seed int,
    created_at text
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    run_id text,
    seq serial,
    body text
  )`,
  `CREATE TABLE IF NOT EXISTS world_snapshots (
    run_id text,
    turn int,
    body text,
    PRIMARY KEY (run_id, turn)
  )`,
];

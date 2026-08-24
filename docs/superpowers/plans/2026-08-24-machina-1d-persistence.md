# Machina Lane 1d — Persistence

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ownership: `packages/persistence/**` only.

**Goal:** Project folder read/write + PGlite for autosave and run event logs.

**Architecture:** Disk is source of truth for authored IR. PGlite holds drafts and runs.

**Tech Stack:** Drizzle, `@electric-sql/pglite`, `@machina/core`, Vitest, Node `fs/promises`.

---

### Task 1: project folder round-trip

**Files:**
- Modify: `packages/persistence/package.json`
- Create: `packages/persistence/src/project-files.ts`, `packages/persistence/src/index.ts`, `packages/persistence/tests/project-files.test.ts`

**Interfaces:**

```ts
import type { MachinaProject, GraphDocument } from "@machina/core";

export type ProjectMeta = {
  schemaVersion: 1;
  id: string;
  name: string;
  entryGraphId: string;
  presetRefs: string[];
};

export async function saveProject(dir: string, project: MachinaProject): Promise<void>;
export async function loadProject(dir: string): Promise<MachinaProject>;
```

`saveProject` writes `machina.json` as `ProjectMeta` (no graphs array) and `graphs/<id>.json` per graph. Creates `presets/` and `assets/` empty dirs if missing.

`loadProject` reads those files back to `MachinaProject`.

- [ ] **Step 1: Test using `os.tmpdir()` + random folder: save fixture project with two graphs (parent + subgraph), load, expect equal ids, names, edges, configs. Positions preserved on disk (editor needs them).**

- [ ] **Step 2: FAIL, implement with `fs.mkdir({ recursive: true })` and `JSON.stringify(graph, null, 2)`.**

- [ ] **Step 3: PASS, commit** `feat: save and load Machina project folders`

---

### Task 2: PGlite runs + autosave

**Files:**
- Create: `packages/persistence/src/schema.ts`, `packages/persistence/src/db.ts`, `packages/persistence/tests/db.test.ts`

**Interfaces:**

```ts
export type RunRecord = { id: string; projectId: string; seed: number; createdAt: string };

export function createDb(dataDir: string): Promise<{
  autosave(projectId: string, json: string): Promise<void>;
  loadAutosave(projectId: string): Promise<string | null>;
  insertRun(run: RunRecord): Promise<void>;
  appendEvent(runId: string, eventJson: string): Promise<void>;
  listEvents(runId: string): Promise<string[]>;
  insertSnapshot(runId: string, turn: number, json: string): Promise<void>;
  getSnapshot(runId: string, turn: number): Promise<string | null>;
  close(): Promise<void>;
}>;
```

Schema tables: `autosaves(project_id text primary key, body text)`, `simulation_runs(id text primary key, project_id text, seed int, created_at text)`, `events(run_id text, seq serial, body text)`, `world_snapshots(run_id text, turn int, body text, primary key (run_id, turn))`.

Use PGlite `dataDir` file-backed. Drizzle if it binds to PGlite in current versions; if not, `db.exec` SQL is allowed. Do not require Docker.

- [ ] **Step 1: Tests:** autosave then load; insert run, append two events, listEvents length 2; insertSnapshot turn 1, getSnapshot returns json.

- [ ] **Step 2: Implement + PASS + commit** `feat: add PGlite autosave and run event store`

---

Lane 1d done when folder + PGlite tests pass with no Docker.

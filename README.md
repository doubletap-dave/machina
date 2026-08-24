# Machina

Visual simulation studio for agent-based worlds — **browser first**.

**Repo:** https://github.com/doubletap-dave/machina

## Quick start

```powershell
pnpm install
pnpm dev
```

That starts the **runtime** (port 4000) and **Studio** (port 3000), then opens **http://localhost:3000** in your browser.

| URL | What |
|-----|------|
| http://localhost:3000 | **Studio** — build worlds on the canvas |
| http://localhost:4000 | Runtime API (Studio proxies via `/api/runtime/…`) |

### Prerequisites

- Node.js **22** (`.nvmrc`)
- pnpm **9** — `corepack enable`

### Studio shortcuts

- **⌘K / Ctrl+K** — command palette (add nodes)
- **BUILD** tab — active; drag nodes, wire ports, inspect sliders
- **RUN / ANALYZE** — UI shells exist; full live run wiring is still in progress

## Other commands

```powershell
pnpm dev:studio    # Studio only (browser)
pnpm dev:runtime    # Runtime API only
pnpm test           # 67 automated tests (CI / dev, not required to use Studio)
```

## Example world

`examples/dead-channel-lite/` — two nations, diplomacy scenario (used by automated proofs).

## Architecture

Monorepo: compiler → kernel → LangGraph agents → PGlite persistence. Studio talks to runtime over HTTP/WebSocket (not direct kernel imports).

| Package | Role |
|---------|------|
| `apps/studio` | Next.js + XYFlow UI |
| `apps/runtime` | Control plane + WebSocket |
| `packages/graph` | Compile IR → `SimulationPlan` |
| `packages/simulation` | World kernel |
| `plugins/core` | Node kinds + nation presets |

## Docs

- `docs/superpowers/specs/2026-08-24-machina-design.md` — design
- `AGENTS.md` — implementation status
- `docs/reports/` — lane reports

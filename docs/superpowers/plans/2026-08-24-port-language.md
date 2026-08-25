# Port language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every frozen `PortType` has a fixed color and semantic symbol on handles and edges. Themes must not override it.

**Architecture:** `@machina/ui` exports data only (no React). Studio renders SVG glyphs. Replace the body of `flowEdgeStyle` created by canvas-ops. Rebase onto `lane/studio-canvas-ops` if that file is missing: create it with the same export signature.

**Tech Stack:** TypeScript, Vitest, React, `@xyflow/react`.

**Spec:** `docs/superpowers/specs/2026-08-24-port-language-design.md`  
**Lane:** `lane/studio-port-language`  
**Worktree:** `git worktree add ../machina-studio-ports -b lane/studio-port-language`

## Global Constraints

- Do not add `PortType` values. Do not introduce CSS variables for port colors.
- Exact hex from the spec table.
- Glyphs: inline SVG ~10px, no emoji.
- English hover = spec `label` (`World state`, not `WORLD_STATE`).
- TDD, no network, no LLM.
- Do not edit project-store undo, engine, persistence, theme packs.

---

### Task 1: `PORT_LANGUAGE` map

**Files:**
- Create: `packages/ui/src/port-language.ts`
- Create: `packages/ui/src/port-language.test.ts`
- Modify: `packages/ui/src/index.ts`

**Interfaces:** copy types and table from the spec (`PortSymbolId`, `PortLanguage`, `PORT_LANGUAGE`, `portLanguage(type)`).

```ts
import type { PortType } from "@machina/core";

export const PORT_LANGUAGE = { /* every PortType */ } as const satisfies Record<PortType, PortLanguage>;
```

- [ ] **Step 1: Test** `Object.keys(PORT_LANGUAGE).sort()` equals the 13 core port types. `portLanguage("CLOCK").color === "#e4b84a"`. `portLanguage("OBSERVATION").symbol === "eye"`.

- [ ] **Step 2: FAIL then implement. PASS. Commit** `feat: add frozen port language colors and symbols to ui`

---

### Task 2: `flowEdgeStyle` body

**Files:**
- Modify: `apps/studio/src/canvas/edge-language.ts` (create with the canvas-ops signature if absent)
- Create: `apps/studio/src/canvas/edge-language.test.ts`

```ts
import { portLanguage } from "@machina/ui";
import type { PortType } from "@machina/core";

export function flowEdgeStyle(portType: string): { stroke: string; strokeWidth: number } {
  const lang = portLanguage(portType as PortType);
  return { stroke: lang.color, strokeWidth: 2 };
}
```

- [ ] **Step 1: Test** `flowEdgeStyle("OBSERVATION")` deep-equals `{ stroke: "#4ec4d9", strokeWidth: 2 }`.

- [ ] **Step 2: Implement. PASS. Commit** `feat: color canvas edges by source port language`

If `Canvas.tsx` does not yet call `flowEdgeStyle`, add the per-edge `style` lookup (source node port type from registry) — only those lines.

---

### Task 3: Handles + glyphs

**Files:**
- Create: `apps/studio/src/canvas/port-symbol.tsx`
- Modify: `apps/studio/src/components/MachinaFlowNode.tsx`
- Create: `apps/studio/src/components/MachinaFlowNode.test.tsx`

Handle: fill/border = `portLanguage(port.type).color`. `data-port-type={port.type}`. `title` and `aria-label` = `label`. Inner SVG switches on `symbol`.

- [ ] **Step 1: Test** render node with an OBSERVATION in-port; query `[data-port-type="OBSERVATION"]`.

- [ ] **Step 2: Implement glyphs for all 13 symbol ids. PASS. Commit** `feat: render semantic port glyphs on node handles`

---

### Task 4: Connect highlight (optional if <20 lines in Canvas)

**Files:**
- Create: `apps/studio/src/canvas/connect-highlight.ts`
- Modify: `Canvas.tsx` — `onConnectStart` / `onConnectEnd` set `data-active-port-type` on the wrapper. CSS in `globals.css` **only** brightens `[data-port-type="…"]` matching the active type. **Do not** put port hex in CSS variables that themes can override — hardcode nothing in theme files; use the data attribute + inline style already on handles.

If this exceeds ~20 lines in Canvas, keep logic in `connect-highlight.ts`.

- [ ] **Step 1: Unit test** `activeTypeFromHandle(handleId, node)` returns the port type.

- [ ] **Step 2: Implement. PASS. Commit** `feat: highlight legal port targets while connecting`

---

### Task 5: Lane report

- [ ] `pnpm test` PASS. `docs/reports/lane-studio-port-language.md`. Commit `docs: port-language lane report`

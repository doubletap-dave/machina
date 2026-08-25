# Machina — Port language (color + symbols)

Date: 2026-08-24  
Status: Approved  
Coordinator: `2026-08-24-studio-operator-surface-design.md`  
Lane: `lane/studio-port-language`  
Depends on: canvas-ops **merged** (uses `flowEdgeStyle` stub and `isValidConnection`). May be coded on a worktree branched from canvas-ops.  
Must not wait on: themes, kind author.

## 1. Goal

Every frozen `PortType` has a **color** and a **semantic symbol**. Handles, edges, and hover labels show the same language. Themes must not change this map. Compiler still uses `matchPorts` only.

## 2. Lane ownership

**Write**

- `packages/ui/src/port-language.ts` (new)
- `packages/ui/src/port-language.test.ts` (new)
- `packages/ui/src/index.ts` (export `portLanguage`, `PORT_LANGUAGE`)
- `apps/studio/src/components/MachinaFlowNode.tsx`
- `apps/studio/src/canvas/edge-language.ts` (**replace stub body only**; keep the export signature)
- `apps/studio/src/components/MachinaFlowNode.test.tsx` or canvas tests for handle `data-port-type` / title

**Read**

- `packages/core/src/ports.ts` (`PortType` union — do not add members)
- `Canvas.tsx` (how edges are created — you may add `data-port-type` on edges if needed; avoid unrelated refactors)
- Canvas `isValidConnection` (do not duplicate registry lookup in a second rules engine)

**Must not edit**

- `project-store.ts`, `undo-stack.ts`, context menus, engine, persistence, compile, plugin-core, theme CSS variables’ **port** colors (there must be none)

## 3. Data contract (`@machina/ui`)

`@machina/ui` stays **React-free**. Export data + lookup, not components.

```ts
import type { PortType } from "@machina/core";

export type PortSymbolId =
  | "clock"
  | "eye"
  | "play"
  | "burst"
  | "envelope"
  | "coin"
  | "mask"
  | "flag"
  | "book"
  | "link"
  | "radio"
  | "globe"
  | "person";

export type PortLanguage = {
  color: string; // #RRGGBB lowercase
  symbol: PortSymbolId;
  label: string; // English, sentence case, for hover
};

export const PORT_LANGUAGE: Record<PortType, PortLanguage>;

export function portLanguage(type: PortType): PortLanguage;
```

`portLanguage` throws if given a non-`PortType` at runtime (should be impossible in TS). Tests iterate `Object.keys` of a satisfies-Record so a new core `PortType` fails this package until the map is updated.

## 4. Frozen map

| PortType | color | symbol | label |
|----------|-------|--------|-------|
| CLOCK | `#e4b84a` | clock | Clock |
| OBSERVATION | `#4ec4d9` | eye | Observation |
| ACTION | `#9ad64a` | play | Action |
| EVENT | `#e07a3d` | burst | Event |
| MESSAGE | `#a78bfa` | envelope | Message |
| RESOURCE | `#f0c14b` | coin | Resource |
| PERSONALITY | `#e879a8` | mask | Personality |
| GOAL | `#f5e6c8` | flag | Goal |
| MEMORY | `#2dd4bf` | book | Memory |
| RELATIONSHIP | `#f472b6` | link | Relationship |
| SIGNAL | `#60a5fa` | radio | Signal |
| WORLD_STATE | `#94a3b8` | globe | World state |
| ACTOR_REF | `#d6b48a` | person | Actor |

Glyphs: **inline SVG in Studio** (`MachinaFlowNode` or `apps/studio/src/canvas/port-symbol.tsx`), ~10px, 1.5px stroke, no emoji, no Lucide brand dependency required (inline paths preferred so the ui package stays icon-free). If a glyph is unreadable at 10px, change the **path**, not the `PortSymbolId` or meaning.

## 5. Rendering

**Handles:** fill + border use `portLanguage(port.type).color`. Inner glyph uses the symbol id. `title` / `aria-label` = `label`. `data-port-type={port.type}` for tests and for “legal target” CSS.

**Edges:** `flowEdgeStyle(portType)` returns `{ stroke: color, strokeWidth: 2 }`. Canvas already calls this (canvas-ops). Selected edge: brighter opacity via RF `selected` class in `globals.css` **only if** you add a class under `.react-flow__edge.selected` that does not change hue. Prefer `style.stroke` only in this lane; skip global CSS if `style` is enough.

**Drag preview:** optional connection line color = source port color (`connectionLineStyle`). Legal targets: add `data-connectable="true"` via RF `isValidConnection` already false for illegal — brighten handles with `data-port-type` matching the active source type using a class on the canvas wrapper set in `onConnectStart` / cleared in `onConnectEnd`. If that requires more than ~20 lines in `Canvas.tsx`, put start/end handlers in `apps/studio/src/canvas/connect-highlight.ts` and import them.

**Color-blind:** matching is by symbol, not by color alone. Do not drop glyphs.

## 6. What you must not do

- Do not introduce CSS variables for port colors (themes would override them).
- Do not change `matchPorts` copy except by using existing functions.
- Do not color kind **cards** (kind-author / themes).

## 7. Tests (required)

1. `PORT_LANGUAGE` has exactly the `PortType` keys from core (type-level `satisfies` + runtime key list test).
2. Each color matches the table (exact hex).
3. `flowEdgeStyle("OBSERVATION")` equals `{ stroke: "#4ec4d9", strokeWidth: 2 }`.
4. `MachinaFlowNode` / handle: an OBSERVATION handle has `data-port-type="OBSERVATION"` (component test).

## 8. Out of scope

New port types, theme packs, MiniMap kind colors, inventing symbols for cardinality (fan-in vs exclusive share the type’s language).

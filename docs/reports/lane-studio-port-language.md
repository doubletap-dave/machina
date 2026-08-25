# Lane — Studio port language

**Branch:** `master` (no separate lane worktree)  
**Base:** canvas-ops `643ef84`  
**Code tip:** `ba311ca`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `9c4bcdd` | feat: add frozen port language colors and symbols to ui |
| `500879f` | feat: color canvas edges by source port language |
| `69c925d` | feat: render semantic port glyphs on node handles |
| `ba311ca` | feat: highlight legal port targets while connecting |

**Lane code tip:** `ba311ca`

## Test summary

`pnpm --filter @machina/ui test` — **9/9**  
`pnpm --filter @machina/studio test` — **89/89**

| Package | Tests |
|---------|-------|
| `@machina/ui` | 9/9 (4 port-language + 5 english/tokens) |
| `@machina/studio` | 89/89 |

Port-language coverage: `port-language.test.ts` (4), `edge-language.test.ts` (3), `port-symbol.test.tsx` (1), `MachinaFlowNode.test.tsx` (1), `connect-highlight.test.ts` (5). Studio total includes 1 untracked `compose-proposer` test not in this lane.

## Deliverables

- `packages/ui/src/port-language.ts` — frozen `PORT_LANGUAGE` map and `portLanguage(type)` lookup (13 `PortType`s; hex + symbol + English label; React-free)
- `apps/studio/src/canvas/edge-language.ts` — `flowEdgeStyle` stroke from source port language
- `apps/studio/src/canvas/port-symbol.tsx` — 10px inline SVG glyphs (no emoji)
- `apps/studio/src/components/MachinaFlowNode.tsx` — handle fill/border, `data-port-type`, hover `label`
- `apps/studio/src/canvas/connect-highlight.ts` — `data-active-port-type` while connecting; matching handles brighten via `globals.css` (no port hex in CSS variables)

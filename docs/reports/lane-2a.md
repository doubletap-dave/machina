# Lane 2a — Presets + LLM compose

**Branch:** `lane/2a-presets`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-2a`  
**Base:** `WAVE1`  
**Merged to `master`:** `38e1265`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `1d43520` | feat: add builtin Nation Cabinet Agency presets |
| `f800ff9` | feat: add LLM compose compile-and-smoke gate |
| `184bdb1` | feat: save selection as a Machina preset |
| `508cbcd` | chore: finalize lane 2a preset exports and docs |
| `cfd00d3` | docs: lane 2a complete |

**Lane branch tip:** `cfd00d3`

## Test summary

| Package | Tests |
|---------|-------|
| `@machina/plugin-core` | 4/4 (kinds + presets) |
| `@machina/graph` | 9/9 (compile + compose) |
| `@machina/studio` | 8/8 (store + save-preset + shell) |

## Deliverables

- `plugins/core/src/presets/` — `nationPreset`, `cabinetPreset`, `agencyPreset`, `listBuiltinPresets`
- `packages/graph/src/compose.ts` — `composeFromDescription` with compile + smoke gate (default maxRepairs=3)
- `apps/studio/src/presets/save-preset.ts` — `graphFromSelection`, `copyPresetToUserLibrary`

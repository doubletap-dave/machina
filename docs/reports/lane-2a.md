# Lane 2a — Presets + LLM compose

**Branch:** `lane/2a-presets`  
**Worktree:** `C:\Users\axolatl-tank\Projects\machina-2a`  
**Base:** `WAVE1`

## Status

**COMPLETE**

## Commits

| SHA | Message |
|-----|---------|
| `1d43520` | feat: add builtin Nation Cabinet Agency presets |
| `f800ff9` | feat: add LLM compose compile-and-smoke gate |
| `184bdb1` | feat: save selection as a Machina preset |

**Branch tip:** `184bdb1`

## Test summary

| Package | Tests |
|---------|-------|
| `@machina/plugin-core` | 4 passed (kinds + presets) |
| `@machina/graph` | 9 passed (compile + compose) |
| `@machina/studio` | 8 passed (store + save-preset + shell) |

## Deliverables

- `plugins/core/src/presets/` — `nationPreset`, `cabinetPreset`, `agencyPreset`, `listBuiltinPresets`
- `packages/graph/src/compose.ts` — `composeFromDescription` with compile + smoke gate (max 3 repairs)
- `apps/studio/src/presets/save-preset.ts` — `graphFromSelection`, `copyPresetToUserLibrary`

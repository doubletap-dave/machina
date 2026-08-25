# Lane — Studio themes and fonts

**Branch:** `master` (no separate lane worktree)  
**Lane:** `lane/studio-themes-fonts`  
**Spec:** `docs/superpowers/specs/2026-08-24-studio-themes-and-fonts-design.md`  
**Plan:** `docs/superpowers/plans/2026-08-24-studio-themes-and-fonts.md`  
**Code tip:** `2d0b80b`

## Status

**DONE**

## Commits

| SHA | Message |
|-----|---------|
| `63f1db5` | feat: add studio theme and font preference storage |
| `967303a` | feat: add five studio chrome themes as css variables |
| `20e6dac` | feat: add studio appearance menu and self-hosted fonts |
| `2d0b80b` | test: theme switch does not recolor port language |

Docs commit follows this report.

## Test summary

TDD: prefs tests failed (missing module) → storage helpers. ThemeRoot tests failed (missing component / empty CSS) → five `html[data-machina-theme]` palettes. AppearanceMenu tests failed (missing module) → menu + fontsource. Port invariant is a characterization test: `portLanguage("CLOCK").color` stays `#e4b84a` and `themes.ts` does not import `PORT_LANGUAGE`.

| Package | Tests |
|---------|-------|
| `@machina/ui` | **12/12** (was 10; +2 theme/port invariant) |
| `@machina/studio` | **119/119** |

Commands:

```
pnpm --filter @machina/ui test      # 12/12
pnpm --filter @machina/studio test  # 119/119
```

Studio count includes 1 untracked `compose-proposer` test not in this lane. Lane-owned adds: `studio-prefs.test.ts` (3), `ThemeRoot.test.tsx` (2), `AppearanceMenu.test.tsx` (2).

## Deliverables

- `packages/ui/src/themes.ts` — `MachinaThemeId`, `THEME_LABELS`, CSS variable names, Machina default values
- `packages/ui/src/fonts.ts` — `UiFontId` (`ibm-plex-sans` only), `MonoFontId` union, defaults, `missingFontCopy()`
- `apps/studio/src/lib/studio-prefs.ts` — `localStorage` key `machina.studio.prefs`; unknown ids / garbage JSON → defaults, no throw
- `apps/studio/src/app/globals.css` — five chrome palettes (`machina`, `eve`, `rpo`, `trek`, `wars`) setting `--machina-canvas-bg` through `--machina-minimap-mask`
- `apps/studio/src/components/ThemeRoot.tsx` — `data-machina-theme` on the wrapper and `html`; `--machina-font-ui` / `--machina-font-mono`
- `apps/studio/src/components/AppearanceMenu.tsx` — sentence case `Theme`, `UI font`, `Mono font` in the Studio status bar
- Self-hosted faces via `@fontsource/*` in `apps/studio` (IBM Plex still from `next/font` in `layout.tsx`)

## Fonts

| id | How it ships |
|----|----------------|
| `ibm-plex-sans` / `ibm-plex-mono` | `next/font` + `@fontsource/ibm-plex-mono` |
| `jetbrains-mono-nerd` | `@fontsource-variable/jetbrains-mono` — **nerd glyphs may be absent** (no clean Nerd Font npm package; no runtime network fetch) |
| `cascadia` | `@fontsource/cascadia-code` |
| `fira-code` | `@fontsource/fira-code` |
| `victor-mono` | `@fontsource/victor-mono` |
| `iosevka` | `@fontsource/iosevka` |
| `bitstream-vera-mono` | `@fontsource/dejavu-mono` (DejaVu is the maintained Bitstream Vera Sans Mono lineage) |
| `meslo` | no OFL fontsource package this cycle — picker keeps the id; Studio applies IBM Plex Mono and frozen English `This font isn't installed. Using IBM Plex instead.` |

## Invariants

- Appearance is **not** written to `machina.json`.
- No port-color CSS variables. `portLanguage("CLOCK").color` is `#e4b84a` for every theme id. `port-language.ts` was not modified.
- Canvas already used `--machina-canvas-bg`; this lane did not restyle handles or edit `MachinaFlowNode.tsx`.

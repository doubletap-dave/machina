# Studio themes and fonts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five original Studio palettes and independent UI/mono font pickers. Theme and fonts stay on this machine. Port language colors must not change.

**Architecture:** CSS variables on `html[data-machina-theme]`. Prefs in `localStorage` key `machina.studio.prefs`. Fonts self-hosted via `@fontsource/*` or vendored OFL under `apps/studio/public/fonts/`. Rebase onto canvas-ops so `--machina-canvas-bg` already exists.

**Tech Stack:** Next.js 15, Tailwind 4, Vitest, `localStorage`.

**Spec:** `docs/superpowers/specs/2026-08-24-studio-themes-and-fonts-design.md`  
**Lane:** `lane/studio-themes-fonts`

## Global Constraints

- No official logos or trademarked type files (no Aurebesh/LCARS dumps).
- Do not persist appearance in `machina.json`.
- UI font list this cycle: `ibm-plex-sans` only. Mono: Plex Mono, JetBrains Mono Nerd, Cascadia, Meslo, Fira Code, Victor Mono, Bitstream Vera Sans Mono, Iosevka.
- Defaults: UI Plex Sans, mono JetBrains Mono Nerd.
- Missing font → fall back to Plex + English `This font isn't installed. Using IBM Plex instead.`
- `pnpm add <pkg>@latest` from `apps/studio` for fontsource packages.
- Do not edit `port-language.ts` or engine.

---

### Task 1: Prefs load/save

**Files:**
- Create: `packages/ui/src/themes.ts` — `MachinaThemeId` union + `THEME_LABELS`
- Create: `packages/ui/src/fonts.ts` — `UiFontId`, `MonoFontId`, defaults
- Create: `apps/studio/src/lib/studio-prefs.ts`
- Create: `apps/studio/src/lib/studio-prefs.test.ts`
- Modify: `packages/ui/src/index.ts`

```ts
export type StudioPrefs = {
  schemaVersion: 1;
  theme: MachinaThemeId;
  uiFont: string;
  monoFont: string;
};

export function loadStudioPrefs(): StudioPrefs;
export function saveStudioPrefs(prefs: StudioPrefs): void;
```

Unknown ids → defaults, no throw.

- [ ] **Step 1: Test** garbage localStorage → `theme: "machina"`. Round-trip `{ theme: "eve", uiFont: "ibm-plex-sans", monoFont: "iosevka" }`.

- [ ] **Step 2: Implement. PASS. Commit** `feat: add studio theme and font preference storage`

---

### Task 2: CSS themes

**Files:**
- Modify: `apps/studio/src/app/globals.css` — blocks for `machina`, `eve`, `rpo`, `trek`, `wars` setting every variable in the spec table (`--machina-canvas-bg` through `--machina-minimap-mask`).
- Modify: `apps/studio/src/components/StudioShell.tsx` — root wrapper `data-machina-theme={prefs.theme}` and CSS vars `--machina-font-ui` / `--machina-font-mono`.

**Intent:** machina = current near-black; eve = navy + desaturated cyan; rpo = cyan/magenta neon on dark; trek = warm ochre blocks (original); wars = charcoal + cream + terminal amber.

- [ ] **Step 1: Test** rendering shell (or a tiny `ThemeRoot`) with `theme: "trek"` sets `data-machina-theme="trek"`. Assert computed `--machina-canvas-bg` is not empty.

- [ ] **Step 2: Implement all five. PASS. Commit** `feat: add five studio chrome themes as css variables`

Do **not** add port-color variables.

---

### Task 3: Font loading + Appearance menu

**Files:**
- Modify: `apps/studio/src/app/layout.tsx` — register extra font CSS variables for each mono face actually installed.
- Create: `apps/studio/src/components/AppearanceMenu.tsx`
- Create: `apps/studio/src/components/AppearanceMenu.test.ts`
- Wire into StudioShell chrome (sentence case `Theme`, `UI font`, `Mono font`).

Vendor JetBrains Mono Nerd OFL into `apps/studio/public/fonts/jetbrains-mono-nerd/` **with license** if npm has no nerd package; otherwise `@fontsource-variable/jetbrains-mono` and document that nerd glyphs may be absent.

Unknown `monoFont` in prefs → apply Plex Mono + frozen English in the menu.

- [ ] **Step 1: Test** selecting `fira-code` calls `saveStudioPrefs` with that id.

- [ ] **Step 2: `pnpm add` fontsource packages from `apps/studio`. Implement. PASS. Commit** `feat: add studio appearance menu and self-hosted fonts`

---

### Task 4: Port color invariant

- [ ] **Step 1: Test** (in `@machina/ui` or studio) `portLanguage("CLOCK").color` is `#e4b84a` regardless of theme id (theme module must not import and overwrite `PORT_LANGUAGE`). If port-language lane has not merged, skip importing it; assert `PORT_LANGUAGE` file is not modified by this lane (`git diff`).

- [ ] **Step 2: Commit** `test: theme switch does not recolor port language`

---

### Task 5: Lane report

- [ ] `pnpm test`. `docs/reports/lane-studio-themes-fonts.md`. Commit `docs: themes-and-fonts lane report`

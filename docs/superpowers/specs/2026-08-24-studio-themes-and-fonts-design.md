# Machina — Studio themes and fonts

Date: 2026-08-24  
Status: Approved  
Coordinator: `2026-08-24-studio-operator-surface-design.md`  
Lane: `lane/studio-themes-fonts`  
Depends on: canvas-ops **merged** (CSS variable seams on the canvas wrapper). Rebase onto canvas-ops.  
Must not wait on: port language (do not recolor ports), kind author.

## 1. Goal

Studio chrome can look like five original palettes. Operators pick **UI font** and **mono font** independently of theme. A world folder does **not** store theme or fonts. Port language colors stay as spec 2 (or gray handles if ports have not merged yet — you still must not introduce port CSS variables).

## 2. Legal

Original palettes **inspired by** EVE, Ready Player One, Star Trek, Star Wars. **No** official logos, stills, or trademarked typefaces (no shipped Aurebesh/LCARS font files). Picker labels may use the names below in this repo.

## 3. Lane ownership

**Write**

- `packages/ui/src/themes.ts` (new) — theme **ids** + CSS variable **names** + default Machina values (documentation in code, not React)
- `packages/ui/src/fonts.ts` (new) — font id union + default ids
- `packages/ui/src/index.ts` exports
- `apps/studio/src/lib/studio-prefs.ts` (new) — load/save
- `apps/studio/src/lib/studio-prefs.test.ts`
- `apps/studio/src/components/AppearanceMenu.tsx` (new) — theme + two font `<select>`s
- `apps/studio/src/app/globals.css` — `[data-machina-theme="…"]` blocks
- `apps/studio/src/app/layout.tsx` — extra `@font-face` / next-font / fontsource class variables
- `apps/studio/src/components/StudioShell.tsx` — set `data-machina-theme` on a root wrapper, apply font CSS variables, mount AppearanceMenu (status bar or existing chrome — **sentence case** `Theme` / `UI font` / `Mono font`)

**May edit one canvas file:** `apps/studio/src/components/Canvas.tsx` **only** if canvas-ops did not attach `--machina-canvas-bg` on the wrapper. Prefer not to. Do not restyle handles.

**Must not edit**

- `port-language.ts`, `MachinaFlowNode.tsx`, `matchPorts`, engine, persistence, kind manifests, `project-store` undo

## 4. Theme ids (frozen)

```ts
export type MachinaThemeId =
  | "machina"
  | "eve"
  | "rpo"
  | "trek"
  | "wars";
```

Picker labels: `Machina default`, `EVE`, `Ready Player One`, `Star Trek`, `Star Wars`.

Each theme **must** set:

| CSS variable | Role |
|--------------|------|
| `--machina-canvas-bg` | Infinite canvas |
| `--machina-panel-bg` | Library, inspector, status bar |
| `--machina-panel-border` | Panel edges |
| `--machina-text` | Primary chrome text |
| `--machina-text-muted` | Secondary |
| `--machina-accent` | Quiet accent (not neon soup on Machina default) |
| `--machina-node-fill` | Default node card fill. Kind-author `cardColor` is a stripe on top; themes do not override that stripe. |
| `--machina-node-stroke` | Default node card border |
| `--machina-minimap-node` | Resolved MiniMap node fill (hex) |
| `--machina-minimap-mask` | MiniMap mask |

**Intent (not pixel-perfect branding):**

| id | Feel |
|----|------|
| machina | Near-black canvas, gray panels (current look) |
| eve | Deep navy/black, thin HUD, desaturated cyan accent |
| rpo | Dark + cyan/magenta neon, denser panels |
| trek | Warm dark, ochre/amber rectangular blocks — original geometry |
| wars | Charcoal, cream text, single terminal-amber accent |

Default theme: `machina`.

## 5. Fonts

Two independent prefs: `uiFont`, `monoFont`.

**UI list (sans that we actually ship this cycle):**

| id | Family |
|----|--------|
| `ibm-plex-sans` | IBM Plex Sans (already in `layout.tsx`) |

Do **not** put mono-only faces in the UI list. A one-item UI picker is correct: Omarchy faces are mono. The control still exists so a later sans can join the list without a new spec.

**Mono list (all self-hosted / npm OFL or Apache):**

| id | Face |
|----|------|
| `ibm-plex-mono` | IBM Plex Mono |
| `jetbrains-mono-nerd` | JetBrains Mono Nerd Font |
| `cascadia` | Cascadia Code |
| `meslo` | Meslo |
| `fira-code` | Fira Code |
| `victor-mono` | Victor Mono |
| `bitstream-vera-mono` | Bitstream Vera Sans Mono |
| `iosevka` | Iosevka |

Defaults: `uiFont = ibm-plex-sans`, `monoFont = jetbrains-mono-nerd`.

**Vendoring:** add npm `@fontsource/*` (or `@fontsource-variable/*`) from the **studio** package with `pnpm add …@latest` in `apps/studio`. For JetBrains Mono **Nerd**: if no clean npm package exists, vendor OFL files under `apps/studio/public/fonts/jetbrains-mono-nerd/` **with the license file**. Do not fetch fonts from the network at runtime.

**Missing face:** apply IBM Plex (sans or mono as appropriate) and English: **`This font isn't installed. Using IBM Plex instead.`**

Chrome uses `--machina-font-ui`; IR, packets, turn/cost numbers use `--machina-font-mono`. Wire these in `globals.css` / `StudioShell`. `@machina/ui` `font` and `fontMono` exports should read as **fallback strings** that match Plex; Studio overrides via CSS variables. Do not make `@machina/simulation` depend on fonts.

## 6. Persistence

`studio-prefs.ts` reads/writes `localStorage` key `machina.studio.prefs` JSON:

```ts
{
  schemaVersion: 1,
  theme: MachinaThemeId,
  uiFont: string,
  monoFont: string
}
```

Invalid JSON or unknown ids → defaults, no throw to the UI. **Not** written to `machina.json`.

## 7. Tests (required)

1. Unknown theme id in localStorage loads as `machina`.
2. Setting theme writes `data-machina-theme` on the wrapper (component test).
3. `font` / prefs: selecting `fira-code` sets `--machina-font-mono` to that family (assert computed style or class).
4. Prefs round-trip: save `{ theme: "eve", uiFont: "ibm-plex-sans", monoFont: "iosevka" }`, reload helper returns the same.
5. **No** test may require `PORT_LANGUAGE.CLOCK.color` to change when theme is `trek`.

## 8. Out of scope

User-uploaded CSS, more than five themes, sound, motion besides existing skip-animations, changing port language, storing appearance in the project folder.

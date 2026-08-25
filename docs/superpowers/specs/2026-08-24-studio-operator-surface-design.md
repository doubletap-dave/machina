# Machina — Studio operator surface (coordinator)

Date: 2026-08-24  
Status: Approved for implementation planning  
Parent: `2026-08-24-machina-engine-and-studio-design.md` (engine doors, no fakes). This cycle adds Studio authoring chrome. It does **not** replace engine tasks 10–14 (rich cards, real Think, overlays, Describe, proof).

## 1. What this is

Four independent specs, one product. Studio must **edit**, **show wire language**, **skin itself**, and **author kinds without fake physics**. Other apps still load the **project folder**, not Studio’s theme.

| # | Spec | Slice |
|---|------|--------|
| 1 | `2026-08-24-studio-canvas-ops-design.md` | Canvas surgery |
| 2 | `2026-08-24-port-language-design.md` | Color + semantic port symbols |
| 3 | `2026-08-24-studio-themes-and-fonts-design.md` | Five themes, font pickers |
| 4 | `2026-08-24-kind-author-design.md` | Project kinds, library, pin, run-refuse |

Write **four implementation plans** (one per spec). Do not collapse into a single plan. Subagents must be able to execute from the spec + plan without rereading this file, except for the seam table below.

## 2. Locked product decisions (all specs)

- Custom kinds in Studio: name, ports, card color, inspector fields. **No** simulation code in the browser.
- Kinds live in the **project**. **Publish to my library** is a copy. Project **pins a hash**. Library edits never silently change a shipped folder.
- Compile may succeed with sockets-only kinds. **Run / `engine.start` refuses in English** until a plugin supplies `runtime`.
- Port language: color **and** semantic symbols. Themes must not recolor ports.
- Themes: Machina default, EVE, Ready Player One, Star Trek, Star Wars — original palettes, no licensed art. Theme is **this machine’s Studio prefs**, not `machina.json`.
- Fonts: UI and mono pickers, independent of theme. Defaults: IBM Plex Sans (UI), JetBrains Mono Nerd (mono). Omarchy mono set + IBM Plex Mono ship in the picker.
- Canvas: Delete/Backspace, right-click, undo (no confirm dialogs), hide React Flow attribution, visible MiniMap, `matchPorts` on connect.
- Positions never enter the kernel. No new `PortType` values. No `if (project.name === "dead-channel")`.

## 3. Parallel subagents — file ownership

**Plans:** write all four in parallel.  
**Code:** slice **4 may start in parallel with 1** (almost no file overlap). Slices **2 and 3 rebase onto 1** (they plug into seams 1 creates). Merge **1 → 2 → 3**; merge **4 anytime** after its own tests pass (before or after 1). If 2 and 1 land the same week, expected conflict is **≤10 lines** in `Canvas.tsx` (edge style import). Spec 2 lists the exact import.

| Lane | Branch name | Owns (write) | Must not edit |
|------|-------------|--------------|----------------|
| Canvas | `lane/studio-canvas-ops` | See spec 1 | `packages/ui/src/port-language.ts`, theme files, `packages/core/src/kind-manifest.ts`, persistence kinds I/O, engine `start` kind check |
| Ports | `lane/studio-port-language` | See spec 2 | project-store undo/delete, context menus, `packages/core` IR, engine, persistence |
| Skin | `lane/studio-themes-fonts` | See spec 3 | port language map, kind manifest, compile, engine |
| Kinds | `lane/studio-kind-author` | See spec 4 | `Canvas.tsx`, `MachinaFlowNode.tsx`, theme CSS, port colors |

**Read-only for every lane:** `@machina/core` ports (`PortType`, `matchPorts`), `@machina/graph` compile behavior (except kind-author’s registry merge), plugin-core kind **ids**.

## 4. Seams (stable APIs between lanes)

These names are frozen. Later lanes bind to them; they do not invent a second channel.

| Seam | Created by | Consumed by | Contract |
|------|------------|-------------|----------|
| CSS `--machina-canvas-bg` | Canvas sets fallback `#0c0c0c` on the canvas wrapper | Themes | Themes set the variable on `html[data-machina-theme]`. Canvas does not hardcode a second background. |
| CSS `--machina-minimap-node`, `--machina-minimap-mask` | Canvas MiniMap uses JS fallbacks `#8a8a8a` and `rgba(12,12,12,0.8)` if `getComputedStyle` is empty | Themes | Theme CSS defines the variables. MiniMap `nodeColor` is a function that reads the computed `--machina-minimap-node` (React Flow needs a resolved color, not a `var()` string). |
| `apps/studio/src/canvas/edge-language.ts` | Canvas **creates the file** with `export function flowEdgeStyle(_portType: string): { stroke?: string } { return {}; }` | Ports **replaces the body** | Canvas `defaultEdgeOptions` / per-edge `style` call this. Ports must not move the export. |
| `portLanguage(type)` in `@machina/ui` | Ports | Ports + optional kind-author card (not required) | See spec 2. Themes must not import and override colors. |
| `KindManifest` + `kindPins` | Kinds | Engine, persistence, Studio library | See spec 4. `loadProject` return type unchanged. Other lanes do not add fields. |
| `kindNoRuntimeCopy` in `@machina/core` | Kinds | Engine + Studio | Frozen English. Engine must not import `@machina/ui`. |
| `onPossessNode?: (nodeId: string) => void` | Canvas context menu | StudioShell (existing run client) | Canvas does not call the engine. Missing callback or no paused run → English in spec 1. |

## 5. Worktrees

```text
git worktree add ../machina-studio-canvas -b lane/studio-canvas-ops
git worktree add ../machina-studio-ports -b lane/studio-port-language
git worktree add ../machina-studio-skin -b lane/studio-themes-fonts
git worktree add ../machina-studio-kinds -b lane/studio-kind-author
```

Ports and skin worktrees should `git rebase` onto canvas-ops after slice 1 merges. Kinds worktree rebases onto `master` (or canvas if Studio library layout moved).

## 6. Out of this surface

Prompt-invented plugins, BRANCH HERE, user CSS themes, new `PortType` values, mock Think, overlays/view-as (engine-and-studio spec tasks 12–14).

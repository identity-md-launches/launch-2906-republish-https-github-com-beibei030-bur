# Burrowkeep design

## Overview

Burrowkeep is the existing bilingual CPU mining and hamster-care game from revision `3fa8c2f`. A warm wooden pixel burrow carries its visual identity: the scene comes first, followed by mining, resources, care and the home shop. Wealth and decor sit alongside the game on desktop and below it on mobile. This revision preserves that composition, artwork, terminology and economy.

`styles.css` is the styling source of truth. `mill.js` renders the scene and UI patterns; `index.html` supplies the page landmarks. Later CSS declarations intentionally override older retained project styles. Documented values below describe the active page, not unused historical `.chronicle`, `.rules` or card patterns.

## Colors

| Token or active value | Value | Implemented use |
| --- | --- | --- |
| Body background | `#120c16` | Effective solid page background; overrides the earlier body gradient. |
| `--bg` | `#140e0a` | Retained original dark token; the active body uses the override above. |
| `--ink` | `#f4e7d0` | Main dark-surface text and selected shop tab. |
| `--muted` | `#cbb89a` | Descriptions, status, meter labels and footer text. |
| `--paper` | `#f3e6cf` | Default button and invite-field fill. |
| `--paper-ink` | `#2a2118` | Text on paper and amber controls. |
| `--lamp` | `#f2b544` | Start fill, focus indicator, links and gold. |
| `--clay` | `#c86b4a` | Active Stop background. |
| `--mining-ink` | `#140e0a` | Accessible dark text on the clay Stop button. |
| `--moss` | `#8eae78` | Retained resource accent token. |
| `--line` | `rgba(244, 231, 208, 0.16)` | Subtle surface and utility borders. |
| Stage / leaderboard fill | `#24160f` | Wooden scene frame and ranking panels. |
| Heavy frame / inset bevel | `#1a100c` / `#6b4429` | Pixel-art frame structure. |
| Resource tile fill / border | `#241428` / `#3a2418` | Sand tiles, tab borders and invite controls. |
| Shop hint text | `#6d5c49` | Supporting text on paper buttons. |
| Iron / silver / gold values | `#c5ccd4` / `#f4f4f6` / `#f2b544` | Resource values; each also has a written label. |

Tokens live at `styles.css:1`; active component treatments are later in the same file. Measured opaque pairs: Start `#2a2118` on `#f2b544` is **8.63:1**, Stop `#140e0a` on `#c86b4a` is **5.16:1**, and shop hints `#6d5c49` on `#f3e6cf` are **5.20:1**. The probe also checks resolved DOM text backgrounds. These measurements do not certify the painted canvas or every possible runtime value.

## Typography

The two existing role stacks remain:

- `--serif`: `"Iowan Old Style", "Palatino Linotype", Palatino, "Songti SC", "Noto Serif SC", Georgia, serif` for the title, board headings and resource/meter values.
- `--sans`: `"Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif` for prose, actions and labels.

No fonts are downloaded or bundled. The available system fonts determine the actual face and weight rendering; matching named faces across operating systems is not guaranteed.

| Role | Size | Weight and rhythm |
| --- | --- | --- |
| Supporting labels, hints, ranking summary | `13px` | 400, inherited 1.5 line height. |
| Body, lede, buttons and invite input | `16px` | 400; action emphasis and strong text use 700; body line height 1.5. |
| Board headings / currency values | `20px` | Headings 500, values 700. |
| Meter values | `28px` | 700, line height 1.1. |
| Product title | `clamp(32px, 4vw, 44px)` | 500, line height 0.95, tracking `-0.03em`. |
| Ore balance | `40px` | 400, line height 1. |

At each inspected width the page uses six distinct sizes including one-offs, two role stacks and three weights. The lede has a `38em` maximum measure. Labels use natural casing and tracking. Ranking rows have tabular numbers; miner IDs wrap without ellipsis. The invite field remains at least 16px to avoid small-input zoom behavior.

## Layout

Shared content width is `min(1240px, calc(100% - 32px))`, giving 16px side margins. The desktop main grid uses `minmax(0, 1fr) 260px`, a 16px gap and a 12px top margin. The stage and choices occupy the first column. `.boards` occupies the second column across both rows, sticky at 12px from the top.

At **720px and below**, the existing mobile rules now appear after the desktop components: main becomes one column, rankings become static and follow the choices, the header stacks, and the Home shop becomes one column. Care stays in its existing two-column grid. The choices use two columns for balance/label, then full rows for status, Start/mode, progress, resources, meters, shop selection, shop and invites. Start remains adjacent to its idle/hashrate explanation.

Sand tiles and meters each use three `minmax(0, 1fr)` columns. Home shop uses three columns above the breakpoint; Care uses two. Common gaps are 8px within control groups, 10–12px within resource/board groups and 16px between major panels. Choices have `14px 16px 16px` padding; shop controls use 12px.

The canvas displays at a 2:1 ratio with pixelated scaling. Its logical artwork is 192×96, drawn to a 960×480 backing canvas. Responsive and language variants were checked at 320, 390, 720, 721, 1024 and 1440px. The 390×844 first screen contains the title, full game scene and Start. Text enlargement was checked separately from native browser zoom.

## Elevation & Depth

The scene's 4px dark frame and 3px inset wooden bevel belong to the original pixel artwork treatment. Rankings also use 4px frames. Choices use a quiet 1px separator border over `rgba(255, 244, 224, 0.03)`. Meter surfaces use `rgba(0, 0, 0, 0.22)`. There are no floating dialogs, modal layers, drop-shadow cards or added decorative effects.

## Shapes

Stage, choices and game buttons are square. The language utility keeps its `999px` pill radius. Meters retain 12px corners; pip bars use `99px` corners. Resource tiles, shop tabs and invite fields use heavy square borders. Preserve these established exceptions rather than assigning one new radius to everything.

## Components

| Pattern and source | Variants and behavior |
| --- | --- |
| Scene: `index.html:29`, `mill.js:679`, `#room` | Named image/canvas with original hamster, wheel, home items and ore effects. Reduced-motion freezes decorative movement while balances and gameplay keep updating. |
| Mining row: `mill.js:635`, `.run-row`, `#power`, `#mode` | Amber Start; clay Stop with dark text. Both controls use native buttons, explicit pressed state and a 44px minimum height. Mode toggles the existing unlocked-thread behavior. |
| Resources/meters: `renderSands()`, `renderMeters()`, `.sand`, `.meter`, `.pips` | Written labels and values accompany colored resource treatments. Food and levels use the original eight-pip maximum. |
| Shop selector: `mill.js:344`, `.tabs button` | Home shop / Care are persistent native buttons with `aria-pressed`; focus survives rerenders. Selected fill uses `--ink`. |
| Shop item: `renderShop()`, `.shop button` | Strong item label, price/effect hint, native disabled state for unavailable purchases, reduced opacity. Bought decor has the existing level and next upgrade price. |
| Invite: `mill.js:582`, `.invite` | A visible label bound to the read-only URL, copy button, binding/reward text and polite connection status. Clipboard success says Copied; failure focuses/selects the link and gives manual-copy guidance. Polling preserves the controls and focus. |
| Boards: `mill.js:516`, `mill.js:549`, `.board` | Ordered fetched ranks, highlighted own ID, trailing numeric score. Distinct connecting, empty, unavailable and populated states. Stale rows stay visible with an unavailable notice. Long IDs wrap. |
| Focus: `styles.css:41` | Existing 2px amber `:focus-visible` outline, offset 3px; native keyboard activation. No custom tab widget or dialog behavior. |

`api.js` handles the existing remote service. It supplies no simulated ranks or rewards. Components do not claim a successful request when a response failed. The product has one dark theme and Chinese/English variants; it has no wallet, overlay or theme-switching system.

## Do's and Don'ts

- Start from the existing content-width/grid primitives and reuse the wooden scene, paper controls and role tokens.
- Keep primary mining actions in the first mobile screen, with CPU-use guidance nearby.
- Preserve economy constants, costs, item data, storage keys and the first-inviter lock when changing presentation.
- Use native buttons and labels; retain stable DOM nodes for controls updated by polling.
- Distinguish actual API data from unavailable/empty states. Never fill a leaderboard with invented players.
- Keep CSS mobile overrides after desktop component rules. Test both languages on each side of the 720px breakpoint.
- If another surface is needed later, reuse `.top`, the content-width rule, existing type roles and `.board`/button patterns. Do not introduce a new hero, font, wallet flow or color system for this republication.

Documentation follows the pinned Better Interface guidance by Jakub Krehel (MIT, `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and the adapted Impeccable documentation method by Paul Bakaus (Apache-2.0, `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Their notices and licenses are retained in [artifacts/THIRD-PARTY-LICENSES.txt](artifacts/THIRD-PARTY-LICENSES.txt); those notices apply to the guidance, not a new license grant for the upstream game.

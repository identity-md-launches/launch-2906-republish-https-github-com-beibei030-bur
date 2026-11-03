# Burrowkeep

A static republication of [beibei030/burrowkeep at `3fa8c2f`](https://github.com/beibei030/burrowkeep/tree/3fa8c2f). It retains the pixel burrow, Chinese/English interface, CPU mining, economy, shop, care, invites and leaderboards. The mining engine and economy are unchanged. This revision restores calls to the existing shared invite/leaderboard service, with the metadata, accessibility and responsive corrections required for this export.

## Install, rebuild and preview

Use Node.js 24 and npm. From the repository root:

```sh
npm ci --prefix web
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web run preview
```

Open `http://localhost:4173/preview/`. Stop the preview with Ctrl+C. It serves the production export under a subpath so relative URLs are exercised.

`web/package.json` and `web/package-lock.json` contain the development tooling. The site itself remains native JavaScript modules and CSS; no framework, wallet or runtime package dependency was added. The build copies an explicit list of runtime files into `dist/`, without depending on scratch files or the project handoff.

Publish the complete **contents of `dist/`** to a static host. `dist/index.html`, CSS, modules, the worker, its SHA-256 module and the social image are included. Asset URLs are relative and the page has no server routes to rewrite. HTTPS is required for normal public use of workers, secure random identifiers and the clipboard. No backend process is included in the export.

## Existing API

`api.js` uses the service URL from the pinned commit on every static host and gateway:

```text
https://aiqiang888.com/burrowkeep-api
```

| Method and path | Purpose |
| --- | --- |
| `POST /api/hello` | Register the existing miner ID and lock its first inviter. |
| `POST /api/pulse` | Report newly booked ore using the existing payload. |
| `GET /api/bonus?id=…` | Collect the existing invitation reward and pending remainder. |
| `POST /api/board` | Submit gold and decor scores. |
| `GET /api/board` | Read the shared wealth and decor rankings. |

These calls retain the upstream field names and game rules. Registration precedes score submission, unsuccessful registrations retry, and failed pulses remain queued while the tab stays open. Calls time out after ten seconds and retry on the existing five-second interval. The UI distinguishes connecting, unavailable, genuinely empty and populated rankings; after a failed refresh it retains the last fetched rows with an unavailable notice. There are no fabricated players or browser-only shared rankings.

**Service limitation observed on 2026-11-03:** the configured leaderboard URL returned HTTP 404 with an HTML response. The registration preflight also lacked the required CORS response header. The production browser therefore displayed the unavailable/retry state. Live invite payouts and shared score persistence could not be confirmed. The service must be available and allow the published site's Origin for these features to work; changing static hosting cannot supply those API routes. No alternate service URL was invented.

Progress and language remain in the original browser storage keys. Mining starts only after Start is activated. Invites and rankings depend on the shared service. As in the upstream game, the unsent ore pulse buffer is in memory; closing or reloading the page before recovery does not persist that buffer. The retained `server.mjs`, `game.js`, `rules.js` and `brief.json` are historical project source, not files required by the static export.

## Validation

```sh
node web/node_modules/playwright/cli.js install chromium
npm --prefix web run test
npm --prefix web run test:browser
```

The browser suite manages its own temporary preview and closes it when finished. Its API fixtures exist only inside the tests and never enter the production site. Diagnostic output goes to `test/scratch/`, which is disposable.

Actual final results:

| Check | Result |
| --- | --- |
| Production build | Passed; eight runtime files, 73,800 bytes. |
| TypeScript `checkJs`, no emit | Passed for every runtime JavaScript module, including the worker. |
| Game/export tests | 4 passed: SHA-256 vectors, original economy and caps, transactions, current export assets. |
| Chromium interaction tests | 8 passed, including real CPU mining, keyboard start/stop, exchanges and care, decor scores, invite locking/retry, copy fallback, rewards and leaderboard recovery. |
| Responsive layouts | Checked at 320, 390, 720, 721, 1024 and 1440 CSS px in Chinese and English. Game and Start are on the first 390 px screen. |
| Accessibility | Axe WCAG A/AA scan: zero violations in the tested idle view; active Stop also passed. Keyboard focus, 200% text enlargement and static reduced-motion scene checked. |
| Pinned design probe | 15/16 checks passed. The repetition flag is identical price/decor data for Bell and Banner, two distinct unchanged game items; retained. |
| Live service | HTTP 404 / CORS failure; local error handling checked, live successful API integration unverified. |

WebKit launch was unsuccessful, so Safari behavior is unverified. Physical devices, screen readers, native browser zoom and social-platform unfurling were not tested. The probe and automated accessibility results cover the inspected states; they do not establish full accessibility compliance.

See [DESIGN.md](DESIGN.md) for implemented tokens and components, and [the validation record](artifacts/validation.md) for requirement coverage, findings, fixes, evidence and limitations. The recorded checks are worker-side observations, not independent certification.

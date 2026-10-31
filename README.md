# Tabletop

A minimal, tablet-first Magic: The Gathering life counter. Static React/TypeScript, installable as a PWA, with no accounts or backend.

## Run

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run lint
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

## At the table

- Supports 2-6 players. Commander starts at 40 life, 1v1 at 20, two-player Brawl at 25, multiplayer Brawl at 30. Custom supports starting life from 1 to 999.
- Opposing groups sit along the long edges of the device. Landscape defaults to two rows, portrait to two columns. The central settings can rotate the grid or restore automatic device orientation. Player controls rotate with their text. An odd count leaves an inactive position.
- Tap the local left or right half to subtract or add one life. Hold to repeat. The central undo arrow reverses the most recent change.
- Tap a name to change it, pick a background color, or enable partner commanders. Tap the ellipsis to edit counters and commander damage.
- Commander damage subtracts life automatically; correcting damage restores the same amount of life. Damage from each commander is independent, including partners. A partner slot with recorded damage must be corrected to zero before switching to a single commander.
- Poison, energy, experience, radiation, tickets and named custom counters are supported. Only enabled, nonzero counters appear on the board. Loss thresholds are indicators, not enforced elimination; rules exceptions remain possible.
- The settings choose a random starting player without resetting totals. New game and setup changes require confirmation and retain names/colors for remaining seats.
- The last 50 changes, game, and preferences are saved locally. Reset clears undo history. Clearing browser data removes the saved game. If storage is blocked, the game remains usable but cannot be restored.

## GitHub Pages

Push this project to a GitHub repository on the `main` branch. In **Settings > Pages > Build and deployment**, select **GitHub Actions**. The included workflow validates and publishes the built site; it obtains the Pages base path automatically, including custom-domain/root sites.

For a manual project-path build:

```sh
VITE_BASE_PATH=/mtg_lifecounter_pwa/ npm run build
```

Use a trailing slash in `VITE_BASE_PATH`. No client routing is required.

## Offline and installation

Open the production site online once and allow its service worker to install before going offline. Browser service workers require HTTPS, except on localhost. Production builds precache the app and locally bundled font/icons; development mode does not install a service worker.

Install through the browser's install command on supported browsers. On iPad/iPhone, use Safari **Share > Add to Home Screen**. The screen stays awake when the browser supports wake lock and permits it. Updates are announced in settings and only applied on request, after saving the game; a storage failure prevents update-triggered reload.

Browser tests cover desktop/mobile layouts, rotated inputs, persistence and offline reopening at both root and project paths. Real-device iPad/Safari and Android/Chrome testing remains necessary for device-specific installation, safe areas, and touch behavior.

The app uses original icons and no card art. It is an independent fan utility, not affiliated with Wizards of the Coast.
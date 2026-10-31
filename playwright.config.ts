import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120000 },
    { command: 'VITE_BASE_PATH=/mtg_lifecounter_pwa/ npx vite build --outDir dist-subpath && node scripts/serve.mjs', url: 'http://127.0.0.1:4174/mtg_lifecounter_pwa/', reuseExistingServer: false, timeout: 120000 },
  ],
});
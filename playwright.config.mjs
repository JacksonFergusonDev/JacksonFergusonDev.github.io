import { defineConfig } from '@playwright/test';

// SITE_URL points the browser tests at an already-running site; otherwise they serve the build.
const siteUrl = process.env.SITE_URL;
const baseURL = siteUrl ?? 'http://127.0.0.1:4322';

export default defineConfig({
  testDir: 'tests/browser',
  outputDir: 'test-results',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a slow CI runner; a test that needed it is reported as flaky.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: siteUrl
    ? undefined
    : {
        command: 'npx astro preview --host 127.0.0.1 --port 4322',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});

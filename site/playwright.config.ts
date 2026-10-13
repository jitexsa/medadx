import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Each worker runs a full Chrome; more than a few overloads typical laptops and CI runners.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `PORT=${PORT} node tests/e2e/serve.mjs`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI },
  projects: [
    // Locally use the installed Chrome; CI installs Playwright's Chromium.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' }, grep: /@mobile/ },
  ],
});

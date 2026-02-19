const { defineConfig, devices } = require('@playwright/test');

// In Testkube the app runs as a sidecar; its IP is injected via PLAYWRIGHT_BASE_URL.
// Locally the webServer block starts the app automatically on port 3001.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Skip webServer when an external server URL is provided (e.g. Testkube sidecar)
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: `DB_PATH=test-e2e.db PORT=3001 "${process.execPath}" src/server.js`,
    url: 'http://localhost:3001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

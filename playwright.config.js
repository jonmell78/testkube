const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // reuseExistingServer: true lets Testkube pre-start the server on 3001
  // before running tests; locally it starts it automatically if not running.
  webServer: {
    command: `DB_PATH=test-e2e.db PORT=3001 "${process.execPath}" src/server.js`,
    url: 'http://localhost:3001/health',
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

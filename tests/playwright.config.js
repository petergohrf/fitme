require('dotenv').config({ path: __dirname + '/.env' });
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: require.resolve('./global-setup.js'),
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve .. --listen 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});

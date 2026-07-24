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
    baseURL: 'http://localhost:9090',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve .. --listen 9090',
    url: 'http://localhost:9090',
    reuseExistingServer: !process.env.CI,
  },
});

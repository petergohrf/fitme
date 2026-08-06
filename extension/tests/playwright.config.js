const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  use: { headless: false }, // E2E with extension must run non-headless
  projects: [
    {
      name: 'integration',
      testMatch: 'integration/**/*.test.js',
      use: { headless: true },
    },
    {
      name: 'e2e',
      testMatch: 'e2e/**/*.e2e.js',
      use: { headless: false },
    },
  ],
});

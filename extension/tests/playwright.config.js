const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['integration/**/*.test.js'],
  timeout: 15000,
  use: { headless: true },
});

// Minimal Playwright config for pure Node.js unit tests (no browser, no server, no Clerk).
// Used for merge.spec.js and any future logic-only tests.
// The default playwright.config.js is for E2E tests that need Clerk + a running web server.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'merge.spec.js',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  // No globalSetup, no webServer, no browser projects needed — plain Node.js assertions only.
});

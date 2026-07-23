// Minimal config for pure Node.js unit tests (e.g. merge.spec.js) that do not
// need a browser, a web server, or Clerk credentials.
// Use: npx playwright test <spec> --config playwright.unit.config.js
// Use the default playwright.config.js (with .env credentials) for full e2e tests.
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

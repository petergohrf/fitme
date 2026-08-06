const path = require('path');
const { chromium } = require('@playwright/test');

const EXTENSION_PATH = path.resolve(__dirname, '../../../');

// Reuse the same profile dir across runs so cookies and history accumulate,
// making the browser look less like a fresh bot session.
const USER_DATA_DIR = path.resolve(__dirname, '../fixtures/e2e-profile');

async function launchWithExtension() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      // Removes navigator.webdriver=true, the #1 bot-detection signal
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions-except=' + EXTENSION_PATH,
      '--load-extension=' + EXTENSION_PATH,
    ],
    // Match a real Windows Chrome install
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  return context;
}

module.exports = { launchWithExtension };

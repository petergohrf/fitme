const path = require('path');
const { chromium } = require('@playwright/test');

const EXTENSION_PATH = path.resolve(__dirname, '../../../');

async function launchWithExtension() {
  const userDataDir = require('os').tmpdir() + '/fitme-e2e-' + Date.now();
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-extensions-except=' + EXTENSION_PATH,
      '--load-extension=' + EXTENSION_PATH,
    ],
  });
  return context;
}

module.exports = { launchWithExtension };

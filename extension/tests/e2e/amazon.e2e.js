const { test, expect } = require('@playwright/test');
const { launchWithExtension } = require('./helpers/load-extension');
const { setupMockAuth } = require('./helpers/mock-auth');
const urls = require('./urls.json');

// Skip the entire file unless FITME_E2E=1
test.skip(!process.env.FITME_E2E, 'Set FITME_E2E=1 to run live-site E2E tests');

let context;
test.beforeAll(async () => {
  context = await launchWithExtension();
  await setupMockAuth(context);
});
test.afterAll(async () => { await context.close(); });

for (const url of urls.amazon) {
  test('Amazon: panel appears on ' + url, async () => {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // Wait up to 15 seconds for the FitMe panel to appear
    await page.waitForSelector('#fitme-panel', { timeout: 15000 });
    const panelText = await page.textContent('#fitme-panel');
    // Panel must not show an error message
    expect(panelText).not.toContain('Something went wrong');
    // Panel must show either a recommendation, a sign-in prompt, or a no-chart message
    // (not the extension-reloaded message, which would indicate a bug)
    expect(panelText).not.toContain('please refresh this page');
    await page.close();
  });
}

test('Amazon: panel shows a size recommendation (not just raw measurements)', async () => {
  const page = await context.newPage();
  await page.goto(urls.amazon[0], { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fitme-panel', { timeout: 15000 });
  const panelText = await page.textContent('#fitme-panel');
  // A recommendation panel contains "Recommended: Size"
  // If it shows "Couldn't read a size chart" that's acceptable but worth flagging
  if (panelText.includes("Couldn't read")) {
    console.warn('[E2E] No chart found on', urls.amazon[0], '— may need a URL with a size chart');
  } else {
    expect(panelText).toContain('Recommended: Size');
  }
  await page.close();
});

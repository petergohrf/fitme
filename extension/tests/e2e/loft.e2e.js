const { test, expect } = require('@playwright/test');
const { launchWithExtension } = require('./helpers/load-extension');
const { setupMockAuth } = require('./helpers/mock-auth');
const urls = require('./urls.json');

test.skip(!process.env.FITME_E2E, 'Set FITME_E2E=1 to run live-site E2E tests');

let context;
test.beforeAll(async () => {
  context = await launchWithExtension();
  await setupMockAuth(context);
});
test.afterAll(async () => { await context.close(); });

for (const url of urls.loft) {
  test('Loft: panel appears on ' + url, async () => {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fitme-panel', { timeout: 15000 });
    const panelText = await page.textContent('#fitme-panel');
    expect(panelText).not.toContain('Something went wrong');
    expect(panelText).not.toContain('please refresh this page');
    if (panelText.includes("Couldn't read")) {
      console.warn('[E2E] No chart found on', url, '— verify this Loft URL has a size chart');
    } else if (panelText.includes('outside this chart')) {
      console.info('[E2E] Chart found; test measurements outside size range on', url);
    } else {
      expect(panelText).toContain('Recommended: Size');
    }
    await page.close();
  });
}

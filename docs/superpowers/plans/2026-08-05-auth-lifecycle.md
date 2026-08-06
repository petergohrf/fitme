# Auth & Lifecycle Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four behavioral bugs in the extension's auth and lifecycle layer: stale userId after sign-out, SPA navigation not re-triggering the panel, extension context invalidated showing a misleading sign-in message, and an infinite setTimeout loop in `page-bridge.js`.

**Architecture:** `content.js` is refactored so the main logic lives in a named `runFitMe()` function that can be called multiple times. A `history.pushState` hook re-runs `runFitMe()` after SPA navigation. The service worker broadcasts `AUTH_CHANGED` to all shopping tabs when a user signs out, and `content.js` listens for it to re-run. A `CONTEXT_INVALID` sentinel distinguishes "extension was reloaded" from "user is not signed in". `page-bridge.js` gains a max-attempts guard.

**Tech Stack:** Vanilla JS, Chrome Extension MV3, Playwright for E2E tests.

## Global Constraints

- **Start this plan AFTER Plan A (`2026-08-05-universal-chart-reader.md`) is merged** — both plans touch `content.js`, and this plan refactors its structure. Start from the post-Plan-A state of the file.
- No npm dependencies in `extension/` — plain JS, no build step
- E2E tests require `FITME_E2E=1` env var — they are skipped otherwise
- Playwright is installed in `tests/node_modules`; run E2E as: `cd tests && FITME_E2E=1 npx playwright test --config ../extension/tests/playwright.config.js --project=e2e`
- The `playwright.config.js` at `extension/tests/playwright.config.js` was created in Plan A — this plan adds the `e2e` project to it

---

### Task C-1: Extract `runFitMe()` + handle `CONTEXT_INVALID` + add `refreshPanel`

**Files:**
- Modify: `extension/content/content.js`

**Interfaces:**
- Produces: `runFitMe()` — async function, callable multiple times; `refreshPanel()` panel function

- [ ] **Step 1: Read the current state of `content.js`**

Open `extension/content/content.js` and read it fully. It should already reflect Plan A's changes (no `readAmazonSizeChart` branch; `readSizeChart` is called directly). If Plan A's changes are not present, stop and merge Plan A first.

- [ ] **Step 2: Refactor the top-level IIFE into `runFitMe()`**

The current file starts with `(async () => { ... })();`. Replace this with:

```js
const FITME_MANNEQUIN_URL = 'https://petergohrf.github.io/fitme/mannequin.html';

async function runFitMe() {
  const site = detectSite(window.location.href);
  if (!site) return;

  let userId;
  try {
    userId = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => {
          if (chrome.runtime.lastError) { resolve('CONTEXT_INVALID'); return; }
          resolve(r?.userId || null);
        });
      } catch (e) {
        resolve('CONTEXT_INVALID');
      }
    });
  } catch (e) {
    userId = 'CONTEXT_INVALID';
  }

  if (userId === 'CONTEXT_INVALID') {
    inject(refreshPanel());
    return;
  }

  if (!userId) {
    inject(signInPanel());
    return;
  }

  if (site.type === 'tag-only') {
    const measurements = await fetchMeasurements(userId).catch(() => null);
    inject(tagOnlyPanel(measurements));
    return;
  }

  let markdown, chart, measurements;
  try {
    [markdown, measurements] = await Promise.all([
      readSizeChart(window.location.href),
      fetchMeasurements(userId),
    ]);
    chart = markdown ? parseSizeChart(markdown) : null;
  } catch (e) {
    console.error('[FitMe] Failed to fetch size data:', e);
    inject(errorPanel());
    return;
  }

  if (!chart) {
    console.info('[FitMe] No size chart found on', window.location.href);
    inject(noChartPanel(measurements));
    return;
  }

  console.info('[FitMe DEBUG] measurements from Firestore:', JSON.stringify(measurements));
  console.info('[FitMe DEBUG] parsed chart:', JSON.stringify(chart));

  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');

  if (rec.noMeasurements) {
    inject(noMeasurementsPanel());
    return;
  }
  inject(recommendationPanel(rec));
}

runFitMe();
```

Delete the old IIFE (`(async () => { ... })();`) completely — it is replaced by the above.

- [ ] **Step 3: Add `refreshPanel` function**

Add `refreshPanel()` alongside the other panel functions in `content.js`:

```js
function refreshPanel() {
  return shell('<p class="fm-message">Extension was updated — please refresh this page to get size recommendations.</p>');
}
```

- [ ] **Step 4: Verify the extension still loads in Chrome**

Open `chrome://extensions`, reload the extension. Navigate to a Loft and an Amazon product URL. Confirm the panel renders (sign-in panel is expected if not logged in — no JS errors should appear in the console).

- [ ] **Step 5: Commit**

```
git add extension/content/content.js
git commit -m "refactor(extension): extract runFitMe(), add CONTEXT_INVALID sentinel and refreshPanel"
```

---

### Task C-2: Add SPA navigation hook

**Files:**
- Modify: `extension/content/content.js`

**Interfaces:**
- Produces: `installSpaHook()` — called once after `runFitMe()` on initial load; re-runs `runFitMe()` on URL change

- [ ] **Step 1: Add `installSpaHook()` and `onUrlChange()` to `content.js`**

Add these two functions after `runFitMe()` and before the `inject()` helper:

```js
function installSpaHook() {
  if (window.__fitme_spa_hook) return; // idempotent — only install once per page lifetime
  window.__fitme_spa_hook = true;

  var originalPushState = history.pushState.bind(history);
  history.pushState = function () {
    originalPushState.apply(history, arguments);
    onUrlChange();
  };
  window.addEventListener('popstate', onUrlChange);
}

function onUrlChange() {
  // Wait for the SPA framework to render the new product before reading the chart.
  // 800ms covers React and Vue re-render cycles on typical product pages.
  setTimeout(function () {
    var site = detectSite(window.location.href);
    if (!site) {
      document.getElementById('fitme-panel')?.remove();
      return;
    }
    runFitMe();
  }, 800);
}
```

- [ ] **Step 2: Call `installSpaHook()` after the initial `runFitMe()` call**

Find the line at the bottom of the file:
```js
runFitMe();
```

Replace with:
```js
runFitMe();
installSpaHook();
```

- [ ] **Step 3: Manually verify on Amazon**

Navigate to an Amazon product page. Then click on a "Customers also bought" recommendation that loads a new ASIN in the same tab (SPA navigation). After ~1 second, the FitMe panel should update to reflect the new product URL. Open the browser console and confirm `[FitMe]` log messages appear for the second product.

- [ ] **Step 4: Commit**

```
git add extension/content/content.js
git commit -m "fix(extension): re-run FitMe panel on SPA navigation via history.pushState hook"
```

---

### Task C-3: AUTH_CHANGED broadcast — service worker + manifest `tabs` permission

**Files:**
- Modify: `extension/background/service-worker.js`
- Modify: `extension/manifest.json`
- Modify: `extension/content/content.js`

**Interfaces:**
- Produces: service worker sends `{ type: 'AUTH_CHANGED' }` to all shopping tabs when userId is cleared; `content.js` listens and re-runs

- [ ] **Step 1: Add `SHOPPING_PATTERNS` constant and broadcast to `service-worker.js`**

Add at the top of `service-worker.js`, before the `onMessage` listener:

```js
// Mirrors the host patterns in manifest.json content_scripts.matches
var SHOPPING_PATTERNS = [
  '*://*.loft.com/*',
  '*://*.anntaylor.com/*',
  '*://*.amazon.com/*',
  '*://*.poshmark.com/*',
];
```

Find the existing `CLEAR_USER_ID` handler:
```js
  if (message.type === 'CLEAR_USER_ID') {
    chrome.storage.local.remove('fitme_user_id', () => {
      sendResponse({ ok: true });
    });
    return true;
  }
```

Replace with:
```js
  if (message.type === 'CLEAR_USER_ID') {
    chrome.storage.local.remove('fitme_user_id', function () {
      sendResponse({ ok: true });
      // Notify all open shopping tabs that auth has changed
      chrome.tabs.query({ url: SHOPPING_PATTERNS }, function (tabs) {
        (tabs || []).forEach(function (tab) {
          chrome.tabs.sendMessage(tab.id, { type: 'AUTH_CHANGED' }).catch(function () {
            // Tab may have no content script — ignore
          });
        });
      });
    });
    return true;
  }
```

- [ ] **Step 2: Add `"tabs"` permission to `manifest.json`**

Find:
```json
"permissions": [
  "storage"
],
```

Replace with:
```json
"permissions": [
  "storage",
  "tabs"
],
```

- [ ] **Step 3: Add `AUTH_CHANGED` listener to `content.js`**

Add after the `installSpaHook()` call at the bottom of `content.js`:

```js
chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === 'AUTH_CHANGED') {
    runFitMe();
  }
});
```

- [ ] **Step 4: Manually verify the sign-out flow**

1. Open FitMe at `https://petergohrf.github.io/fitme/` in one tab and sign in.
2. Open a Loft product page in another tab — FitMe panel should show measurements.
3. Return to the FitMe tab and sign out.
4. Return to the Loft tab — the panel should update to show the sign-in prompt within a few seconds without a page reload.

- [ ] **Step 5: Commit**

```
git add extension/background/service-worker.js extension/manifest.json extension/content/content.js
git commit -m "fix(extension): broadcast AUTH_CHANGED to shopping tabs on sign-out, add tabs permission"
```

---

### Task C-4: Fix `page-bridge.js` polling leak

**Files:**
- Modify: `extension/content/page-bridge.js`

**Interfaces:**
- Produces: `waitForClerk` stops polling after 30 seconds instead of running forever

- [ ] **Step 1: Replace `waitForClerk` with a version that has a max-attempts counter**

The current `page-bridge.js` has:
```js
function waitForClerk() {
  if (window.Clerk && window.Clerk.loaded) {
    sendState();
    window.Clerk.addListener(sendState);
  } else {
    setTimeout(waitForClerk, 300);
  }
}
```

Replace with:
```js
function waitForClerk(attemptsLeft) {
  if (attemptsLeft <= 0) return; // give up after ~30 seconds
  if (window.Clerk && window.Clerk.loaded) {
    sendState();
    window.Clerk.addListener(sendState);
  } else {
    setTimeout(function () { waitForClerk(attemptsLeft - 1); }, 300);
  }
}
```

- [ ] **Step 2: Update the call site to pass the initial count**

Find:
```js
waitForClerk();
```

Replace with:
```js
waitForClerk(100); // 100 × 300ms = 30 seconds maximum
```

- [ ] **Step 3: Verify the existing behaviour is preserved**

The `setTimeout(sendState, 2000)` and `setTimeout(sendState, 5000)` catch-up calls at the bottom of `page-bridge.js` should remain unchanged — do not remove them.

The complete bottom of `page-bridge.js` after the change should look like:
```js
  waitForClerk(100);
  // Extra retries in case session restores after Clerk's loaded flag is set
  setTimeout(sendState, 2000);
  setTimeout(sendState, 5000);
```

- [ ] **Step 4: Commit**

```
git add extension/content/page-bridge.js
git commit -m "fix(extension): cap Clerk polling at 100 attempts to prevent infinite setTimeout loop"
```

---

### Task C-5: E2E test infrastructure and live-site tests

**Files:**
- Modify: `extension/tests/playwright.config.js` (add e2e project)
- Create: `extension/tests/e2e/helpers/load-extension.js`
- Create: `extension/tests/e2e/helpers/mock-auth.js`
- Create: `extension/tests/e2e/urls.json`
- Create: `extension/tests/e2e/amazon.e2e.js`
- Create: `extension/tests/e2e/loft.e2e.js`
- Create: `extension/tests/e2e/anntaylor.e2e.js`
- Create: `extension/tests/e2e/poshmark.e2e.js`

**Interfaces:**
- Consumes: the fully updated extension (all plans merged)
- Produces: live-site E2E tests that verify the complete panel flow against real product pages

- [ ] **Step 1: Add `e2e` project to `extension/tests/playwright.config.js`**

Replace the current content with:
```js
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
```

- [ ] **Step 2: Create `extension/tests/e2e/helpers/load-extension.js`**

```js
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
```

- [ ] **Step 3: Create `extension/tests/e2e/helpers/mock-auth.js`**

This injects a fake `fitme_user_id` into `chrome.storage.local` via the extension's service worker, and intercepts Firestore REST calls to return a canned measurement profile. It does not require a real Clerk account.

```js
const FAKE_USER_ID = 'fitme-e2e-test-user';

// Canned Firestore response for the fake user: 
// bust 92cm, waist 74cm, hips 99cm, inseam 76cm, shoulder 38cm, sleeve 60cm, neck 36cm, thigh 58cm
const FIRESTORE_RESPONSE = {
  name: 'projects/fitme-prod-b672d/databases/(default)/documents/users/' + FAKE_USER_ID,
  fields: {
    fitme_chest:    { mapValue: { fields: { value: { stringValue: '92' } } } },
    fitme_waist:    { mapValue: { fields: { value: { stringValue: '74' } } } },
    fitme_hips:     { mapValue: { fields: { value: { stringValue: '99' } } } },
    fitme_inseam:   { mapValue: { fields: { value: { stringValue: '76' } } } },
    fitme_shoulder: { mapValue: { fields: { value: { stringValue: '38' } } } },
    fitme_sleeve:   { mapValue: { fields: { value: { stringValue: '60' } } } },
    fitme_neck:     { mapValue: { fields: { value: { stringValue: '36' } } } },
    fitme_thigh:    { mapValue: { fields: { value: { stringValue: '58' } } } },
  },
};

async function setupMockAuth(context) {
  // Intercept Firestore calls and return the canned profile
  await context.route(
    '**/firestore.googleapis.com/**',
    route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIRESTORE_RESPONSE) })
  );

  // Inject the fake userId into chrome.storage via the service worker
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length > 0) {
    await serviceWorkers[0].evaluate(function (userId) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ fitme_user_id: userId }, resolve);
      });
    }, FAKE_USER_ID);
  } else {
    // Service worker not yet started — wait for it
    const sw = await context.waitForEvent('serviceworker');
    await sw.evaluate(function (userId) {
      return new Promise(function (resolve) {
        chrome.storage.local.set({ fitme_user_id: userId }, resolve);
      });
    }, FAKE_USER_ID);
  }
}

module.exports = { setupMockAuth, FAKE_USER_ID };
```

- [ ] **Step 4: Create `extension/tests/e2e/urls.json`**

```json
{
  "amazon": [
    "https://www.amazon.com/dp/B09ZXDM5WC",
    "https://www.amazon.com/dp/B07PG5WTFL"
  ],
  "loft": [
    "https://www.loft.com/petite-classic-ponte-blazer/p/123456",
    "https://www.loft.com/flutter-sleeve-midi-dress/p/234567"
  ],
  "anntaylor": [
    "https://www.anntaylor.com/the-linen-blazer/p/497234",
    "https://www.anntaylor.com/flutter-sleeve-dress/p/512345"
  ],
  "poshmark": [
    "https://poshmark.com/listing/Calvin-Klein-Dress-60a123abc456"
  ]
}
```

**Note:** These URLs are starting points. Before running E2E tests, verify each URL loads a real product page and update `urls.json` if any have changed. URL maintenance is intentionally separate from test code.

- [ ] **Step 5: Create `extension/tests/e2e/amazon.e2e.js`**

```js
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
```

- [ ] **Step 6: Create `extension/tests/e2e/loft.e2e.js`**

```js
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
    } else {
      expect(panelText).toContain('Recommended: Size');
    }
    await page.close();
  });
}
```

- [ ] **Step 7: Create `extension/tests/e2e/anntaylor.e2e.js`**

```js
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

for (const url of urls.anntaylor) {
  test('Ann Taylor: panel appears on ' + url, async () => {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fitme-panel', { timeout: 15000 });
    const panelText = await page.textContent('#fitme-panel');
    expect(panelText).not.toContain('Something went wrong');
    expect(panelText).not.toContain('please refresh this page');
    if (panelText.includes("Couldn't read")) {
      console.warn('[E2E] No chart found on', url, '— verify this Ann Taylor URL has a size chart');
    } else {
      expect(panelText).toContain('Recommended: Size');
    }
    await page.close();
  });
}
```

- [ ] **Step 8: Create `extension/tests/e2e/poshmark.e2e.js`**

```js
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

for (const url of urls.poshmark) {
  test('Poshmark: tag-only panel appears on ' + url, async () => {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fitme-panel', { timeout: 15000 });
    const panelText = await page.textContent('#fitme-panel');
    expect(panelText).not.toContain('Something went wrong');
    expect(panelText).not.toContain('please refresh this page');
    // Poshmark is tag-only: panel should show the measurements list
    expect(panelText).toContain('Poshmark shows a tag size only');
    await page.close();
  });
}
```

- [ ] **Step 9: Update `urls.json` with working product URLs**

Before running E2E tests, manually verify that each URL in `urls.json` loads a real product page with a visible size chart (for Loft, Ann Taylor, Amazon) or a size tag (for Poshmark). Update URLs as needed. Commit any URL changes separately:

```
git add extension/tests/e2e/urls.json
git commit -m "test(extension): update e2e product URLs to verified live pages"
```

- [ ] **Step 10: Run E2E tests**

```
cd tests && FITME_E2E=1 npx playwright test --config ../extension/tests/playwright.config.js --project=e2e
```

The first run will open real browser windows. Watch for the FitMe panel appearing on each product page. If any test fails with "Couldn't read a size chart," the URL may not have a chart — update `urls.json` and re-run.

- [ ] **Step 11: Run integration tests to confirm nothing broke**

```
cd tests && npx playwright test --config ../extension/tests/playwright.config.js --project=integration
```
Expected: all integration tests still pass.

- [ ] **Step 12: Final commit**

```
git add extension/tests/e2e/ extension/tests/playwright.config.js
git commit -m "test(extension): add e2e live-site tests for all four supported shopping sites"
```

# Universal Chart Reader — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `dom-chart-reader.js` and `jina-client.js` with a single `universal-chart-reader.js` that reads size charts from any shopping site via a 3-phase cascade: score existing DOM tables → click size chart button + MutationObserver → Jina fallback.

**Architecture:** `readSizeChart(url)` is the single exported function. Phase 1 scores all `<table>` elements currently in the DOM. Phase 2 finds and clicks a "size chart" trigger button and observes for new tables via MutationObserver. Phase 3 relays to the Jina REST API via the service worker. `content.js` calls `readSizeChart` for all chart-type sites, removing the Amazon-specific branch entirely.

**Tech Stack:** Vanilla JS (ES5-compatible), Chrome Extension MV3 content scripts, Playwright for integration tests (installed in `tests/node_modules`), HTML fixture files.

## Global Constraints

- No npm dependencies in `extension/` — plain JS, no build step, no import/export syntax
- All functions work in a Chrome content script context (no Node APIs, no `require`)
- `readSizeChart(url)` is the only globally exposed interface from this file
- Playwright is run from the `tests/` directory: `npx playwright test --config ../extension/tests/playwright.config.js`
- Tests run with `headless: true` by default

---

### Task A-1: Create fixture HTML files and Playwright config

**Files:**
- Create: `extension/tests/fixtures/inline-chart.html`
- Create: `extension/tests/fixtures/lazy-chart.html`
- Create: `extension/tests/fixtures/colspan-header.html`
- Create: `extension/tests/fixtures/multi-row-header.html`
- Create: `extension/tests/fixtures/no-chart.html`
- Create: `extension/tests/fixtures/no-table.html`
- Create: `extension/tests/playwright.config.js`

**Interfaces:**
- Produces: fixture files and Playwright config consumed by Task A-2

- [ ] **Step 1: Create `extension/tests/fixtures/inline-chart.html`**

A table already rendered in the DOM with measurement headers:

```html
<!DOCTYPE html>
<html><body>
<h1>Women's T-Shirt</h1>
<table>
  <thead>
    <tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hips</th></tr>
  </thead>
  <tbody>
    <tr><td>XS</td><td>32-33</td><td>24-25</td><td>34-35</td></tr>
    <tr><td>S</td><td>34-35</td><td>26-27</td><td>36-37</td></tr>
    <tr><td>M</td><td>36-37</td><td>28-29</td><td>38-39</td></tr>
    <tr><td>L</td><td>38-40</td><td>30-32</td><td>40-42</td></tr>
  </tbody>
</table>
</body></html>
```

- [ ] **Step 2: Create `extension/tests/fixtures/lazy-chart.html`**

Table hidden until a "Size Chart" button is clicked — simulates Loft, Ann Taylor:

```html
<!DOCTYPE html>
<html><body>
<h1>Women's Jeans</h1>
<button id="size-chart-btn">Size Chart</button>
<div id="chart-container"></div>
<script>
document.getElementById('size-chart-btn').addEventListener('click', function () {
  document.getElementById('chart-container').innerHTML =
    '<table>' +
    '<thead><tr><th>Size</th><th>Waist</th><th>Hips</th><th>Inseam</th></tr></thead>' +
    '<tbody>' +
    '<tr><td>0</td><td>26-27</td><td>35-36</td><td>30</td></tr>' +
    '<tr><td>2</td><td>27-28</td><td>36-37</td><td>30</td></tr>' +
    '<tr><td>4</td><td>28-29</td><td>37-38</td><td>30</td></tr>' +
    '</tbody></table>';
});
</script>
</body></html>
```

- [ ] **Step 3: Create `extension/tests/fixtures/colspan-header.html`**

A two-row header where the first row has a `colspan` group label — verifies the colspan-aware `tableToMarkdown` keeps column counts consistent:

```html
<!DOCTYPE html>
<html><body>
<table>
  <thead>
    <tr>
      <th rowspan="2">Size</th>
      <th colspan="2">Bust (in)</th>
      <th colspan="2">Waist (in)</th>
    </tr>
    <tr>
      <th>Min</th><th>Max</th>
      <th>Min</th><th>Max</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>S</td><td>33</td><td>34</td><td>25</td><td>26</td></tr>
    <tr><td>M</td><td>35</td><td>36</td><td>27</td><td>28</td></tr>
  </tbody>
</table>
</body></html>
```

- [ ] **Step 4: Create `extension/tests/fixtures/multi-row-header.html`**

A group header row above the actual measurement header row — the fix for this lives in `size-parser.js` (Plan B), but the fixture is created here because Plan A's colspan-aware `tableToMarkdown` must produce the right column count for Plan B's parser to see both rows:

```html
<!DOCTYPE html>
<html><body>
<table>
  <thead>
    <tr><th colspan="4">Measurements in Inches</th></tr>
    <tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hips</th></tr>
  </thead>
  <tbody>
    <tr><td>S</td><td>34-35</td><td>26-27</td><td>36-37</td></tr>
    <tr><td>M</td><td>36-37</td><td>28-29</td><td>38-39</td></tr>
  </tbody>
</table>
</body></html>
```

- [ ] **Step 5: Create `extension/tests/fixtures/no-chart.html`**

A page with a table that scores 0 (no measurement keywords), plus a button labelled "Care Guide" — ensures Phase 2 doesn't click non-size-chart buttons:

```html
<!DOCTYPE html>
<html><body>
<h1>Product Details</h1>
<table>
  <thead><tr><th>Material</th><th>Care</th><th>Origin</th></tr></thead>
  <tbody><tr><td>100% Cotton</td><td>Machine wash cold</td><td>Made in USA</td></tr></tbody>
</table>
<button>Care Guide</button>
</body></html>
```

- [ ] **Step 6: Create `extension/tests/fixtures/no-table.html`**

```html
<!DOCTYPE html>
<html><body>
<h1>Product</h1>
<p>No size information available for this item.</p>
</body></html>
```

- [ ] **Step 7: Create `extension/tests/playwright.config.js`**

```js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['integration/**/*.test.js'],
  timeout: 15000,
  use: { headless: true },
});
```

---

### Task A-2: Write failing integration tests

**Files:**
- Create: `extension/tests/integration/universal-chart-reader.test.js`

**Interfaces:**
- Consumes: fixtures from Task A-1, `extension/scripts/universal-chart-reader.js` (not yet created — tests should fail)
- Produces: a test suite that defines the contract for `readSizeChart`

- [ ] **Step 1: Create `extension/tests/integration/universal-chart-reader.test.js`**

```js
const { test, expect } = require('@playwright/test');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../scripts/universal-chart-reader.js');

// Loads a fixture and injects a chrome mock + the script under test.
// The chrome mock returns Jina failure by default; individual tests can override it.
async function setup(page, fixtureName, jinaMarkdown) {
  const fixturePath = 'file:///' +
    path.resolve(__dirname, '../fixtures', fixtureName).replace(/\\/g, '/');
  await page.goto(fixturePath);
  await page.evaluate(function (md) {
    window.chrome = {
      runtime: {
        lastError: null,
        sendMessage: function (_msg, cb) {
          setTimeout(function () {
            if (md) {
              cb({ ok: true, markdown: md });
            } else {
              cb({ ok: false, error: 'no jina in test' });
            }
          }, 0);
        }
      }
    };
  }, jinaMarkdown || null);
  await page.addScriptTag({ path: scriptPath });
}

test('Phase 1: returns chart markdown when measurement table already in DOM', async ({ page }) => {
  await setup(page, 'inline-chart.html');
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).not.toBeNull();
  expect(result).toContain('Bust');
  expect(result).toContain('XS');
});

test('Phase 2: returns chart markdown after clicking size chart button', async ({ page }) => {
  await setup(page, 'lazy-chart.html');
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).not.toBeNull();
  expect(result).toContain('Waist');
  expect(result).toContain('Inseam');
});

test('colspan: all rows in markdown output have the same column count', async ({ page }) => {
  await setup(page, 'colspan-header.html');
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).not.toBeNull();
  const dataLines = result.split('\n').filter(function (l) { return l.startsWith('|'); });
  const colCounts = dataLines.map(function (l) { return l.split('|').filter(function (s) { return s !== ''; }).length; });
  // Every row must have the same number of columns
  const uniqueCounts = new Set(colCounts);
  expect(uniqueCounts.size).toBe(1);
});

test('Phase 3: returns Jina markdown when no measurement table in DOM and Jina succeeds', async ({ page }) => {
  const jinaResponse = '| Size | Bust | Waist |\n| --- | --- | --- |\n| S | 32-34 | 25-27 |';
  await setup(page, 'no-table.html', jinaResponse);
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).toContain('Bust');
  expect(result).toContain('32-34');
});

test('returns null when no table, no matching button, and Jina fails', async ({ page }) => {
  await setup(page, 'no-chart.html');
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).toBeNull();
});

test('returns null when page has no tables and Jina fails', async ({ page }) => {
  await setup(page, 'no-table.html');
  const result = await page.evaluate(function () { return readSizeChart('http://example.com/p'); });
  expect(result).toBeNull();
});
```

- [ ] **Step 2: Run tests and verify they fail with the expected error**

```
cd tests && npx playwright test --config ../extension/tests/playwright.config.js
```
Expected: all tests fail with "readSizeChart is not defined" or similar. If they fail for a different reason (e.g., file path issue), fix the path before continuing.

---

### Task A-3: Implement `universal-chart-reader.js`

**Files:**
- Create: `extension/scripts/universal-chart-reader.js`

**Interfaces:**
- Produces: `readSizeChart(url)` — `Promise<string|null>` (markdown string or null)

- [ ] **Step 1: Create `extension/scripts/universal-chart-reader.js`**

```js
var SCORE_KEYWORDS = ['bust', 'chest', 'waist', 'hip', 'inseam', 'neck', 'thigh', 'shoulder', 'sleeve'];

function scoreTable(table) {
  var text = Array.from(table.querySelectorAll('th'))
    .map(function (th) { return th.textContent.toLowerCase(); })
    .join(' ');
  return SCORE_KEYWORDS.filter(function (kw) { return text.indexOf(kw) !== -1; }).length;
}

function tableToMarkdown(table) {
  var rows = Array.from(table.querySelectorAll('tr')).map(function (tr) {
    var cells = [];
    Array.from(tr.children).forEach(function (cell) {
      var text = cell.textContent.trim().replace(/\s+/g, ' ');
      var span = parseInt(cell.getAttribute('colspan') || '1', 10);
      for (var i = 0; i < span; i++) { cells.push(text); }
    });
    return cells;
  });
  if (rows.length < 2) return '';
  var line = function (cells) { return '| ' + cells.join(' | ') + ' |'; };
  var sep = rows[0].map(function () { return '---'; });
  return [line(rows[0]), line(sep)].concat(rows.slice(1).map(line)).join('\n');
}

function findBestTable() {
  var tables = Array.from(document.querySelectorAll('table'));
  var best = null, bestScore = 0;
  tables.forEach(function (t) {
    var s = scoreTable(t);
    if (s > bestScore) { best = t; bestScore = s; }
  });
  return bestScore >= 1 ? best : null;
}

function findSizeChartTrigger() {
  var els = Array.from(document.querySelectorAll('a, button, [role="button"], summary'));
  var scored = els.map(function (el) {
    var t = el.textContent.trim().toLowerCase();
    if (/\bsize chart\b/.test(t)) return { el: el, score: 3 };
    if (/size.*(chart|guide)/.test(t)) return { el: el, score: 2 };
    if (/fit.*(chart|guide)/.test(t)) return { el: el, score: 2 };
    if (/\bsizing\b/.test(t)) return { el: el, score: 1 };
    return null;
  }).filter(Boolean);
  if (!scored.length) return null;
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored[0].el;
}

function waitForScoredTable(timeoutMs) {
  return new Promise(function (resolve) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = Array.from(mutations[i].addedNodes);
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType !== 1) continue;
          var tables = node.tagName === 'TABLE'
            ? [node]
            : Array.from(node.querySelectorAll('table'));
          for (var k = 0; k < tables.length; k++) {
            if (scoreTable(tables[k]) >= 1) {
              observer.disconnect();
              resolve(tables[k]);
              return;
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); resolve(null); }, timeoutMs || 5000);
  });
}

function fetchPageMarkdown(url) {
  return new Promise(function (resolve, reject) {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_JINA_MARKDOWN', url: url }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.ok) {
          reject(new Error((response && response.error) || 'Jina fetch failed'));
          return;
        }
        resolve(response.markdown);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function readSizeChart(url) {
  // Phase 1: score tables already in DOM
  var existing = findBestTable();
  if (existing) return Promise.resolve(tableToMarkdown(existing));

  // Phase 2: click size chart trigger, wait for table via MutationObserver
  var trigger = findSizeChartTrigger();
  if (trigger) {
    var tablePromise = waitForScoredTable(5000);
    trigger.click();
    return tablePromise.then(function (table) {
      if (table) return tableToMarkdown(table);
      return fetchPageMarkdown(url).catch(function () { return null; });
    });
  }

  // Phase 3: Jina fallback
  return fetchPageMarkdown(url).catch(function () { return null; });
}
```

- [ ] **Step 2: Run integration tests**

```
cd tests && npx playwright test --config ../extension/tests/playwright.config.js
```
Expected: all 6 tests pass.

- [ ] **Step 3: If any test fails, debug with headed mode**

```
cd tests && npx playwright test --config ../extension/tests/playwright.config.js --headed
```
Check the browser console for errors.

- [ ] **Step 4: Commit**

```
git add extension/scripts/universal-chart-reader.js extension/tests/
git commit -m "feat(extension): add universal-chart-reader with 3-phase cascade + integration tests"
```

---

### Task A-4: Wire into `content.js`, update `manifest.json`, delete replaced files

**Files:**
- Modify: `extension/content/content.js`
- Modify: `extension/manifest.json`
- Delete: `extension/scripts/dom-chart-reader.js`
- Delete: `extension/scripts/jina-client.js`
- Delete: `extension/tests/test-site-detector.html`
- Delete: `extension/tests/test-size-parser.html`
- Delete: `extension/tests/test-recommender.html`

**Interfaces:**
- Consumes: `readSizeChart(url)` from `universal-chart-reader.js`
- Produces: updated `content.js` with no Amazon branch; `noMeasurementsPanel()` function added (for Plan B's `rec.noMeasurements` sentinel)

- [ ] **Step 1: Update `content.js` — remove Amazon branch, call `readSizeChart`**

Find this block in `content.js` (around line 27):
```js
  const markdownSource = site.name === 'amazon'
    ? readAmazonSizeChart()
    : fetchPageMarkdown(window.location.href);
  [markdown, measurements] = await Promise.all([markdownSource, fetchMeasurements(userId)]);
```

Replace with:
```js
  [markdown, measurements] = await Promise.all([readSizeChart(window.location.href), fetchMeasurements(userId)]);
```

- [ ] **Step 2: Add `noMeasurementsPanel` and wire it in**

Find the recommendation block (around line 49):
```js
  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');
  inject(recommendationPanel(rec));
```

Replace with:
```js
  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');
  if (rec.noMeasurements) {
    inject(noMeasurementsPanel());
    return;
  }
  inject(recommendationPanel(rec));
```

Add `noMeasurementsPanel()` function alongside the other panel functions at the bottom of `content.js`:
```js
function noMeasurementsPanel() {
  return shell('<p class="fm-message">Save your measurements on FitMe to get size recommendations.</p>' +
    '<a class="fm-link" href="' + FITME_MANNEQUIN_URL + '" target="_blank" rel="noopener noreferrer">Go to FitMe →</a>');
}
```

- [ ] **Step 3: Update `extension/manifest.json` content_scripts**

In `content_scripts[0].js`, replace:
```json
"scripts/jina-client.js",
"scripts/dom-chart-reader.js",
```
With:
```json
"scripts/universal-chart-reader.js",
```

The final `js` array must be:
```json
"js": [
  "scripts/site-detector.js",
  "scripts/universal-chart-reader.js",
  "scripts/size-parser.js",
  "scripts/recommender.js",
  "scripts/firebase-client.js",
  "content/content.js"
]
```

- [ ] **Step 4: Delete replaced files**

```
git rm extension/scripts/dom-chart-reader.js
git rm extension/scripts/jina-client.js
git rm extension/tests/test-site-detector.html
git rm extension/tests/test-size-parser.html
git rm extension/tests/test-recommender.html
```

- [ ] **Step 5: Load extension unpacked in Chrome and smoke-test**

Open `chrome://extensions` → Enable Developer mode → Load unpacked → select the `extension/` folder. Navigate to a Loft product page and an Amazon product page. Confirm the FitMe panel appears (sign-in panel is expected if not signed in — what matters is that the panel renders at all, and no JS errors appear in the console).

- [ ] **Step 6: Commit**

```
git add extension/content/content.js extension/manifest.json
git commit -m "feat(extension): wire readSizeChart into content.js, add noMeasurementsPanel"
git commit -m "chore(extension): remove dom-chart-reader.js, jina-client.js, legacy test HTML"
```

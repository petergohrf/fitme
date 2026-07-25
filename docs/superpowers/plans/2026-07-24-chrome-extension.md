# FitMe Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that detects supported clothing product pages, reads the size chart via Jina AI Reader, and injects a floating panel recommending the user's best size based on their saved FitMe measurements.

**Architecture:** A content script orchestrates the flow on product pages — it calls Jina to get clean markdown, parses the size chart from that markdown, reads the user's Clerk user ID from local extension storage, fetches measurements from Firestore using the Firebase REST API, computes a recommendation, and injects a fixed-position floating panel. A separate content script running on FitMe pages silently extracts the Clerk user ID and stores it for the extension to use.

**Tech Stack:** Plain JavaScript (no build step, no npm), Chrome Manifest V3, Jina AI Reader (free, no API key), Firebase Firestore REST API (API key: `AIzaSyCdF6UfLUXyY6uxZDk77Bg9cym3Pnvi9f0`, project: `fitme-prod-b672d`), Clerk (user ID extracted from the running FitMe site — no Clerk SDK required in the extension)

## Global Constraints

- No npm, no build step, no external frameworks — plain HTML/CSS/JS files only
- Chrome Manifest V3 (not V2)
- All extension files live in `extension/` at the project root
- Zero paid APIs — Jina Reader is free with no API key; Firestore uses the existing Firebase API key
- Firestore document path: `users/{clerkUserId}` (single document, not nested)
- Firestore field names: `fitme_chest`, `fitme_waist`, `fitme_hips`, `fitme_inseam`, `fitme_shoulder`, `fitme_sleeve`, `fitme_neck`, `fitme_thigh`, `fitme_unit`
- Each Firestore field is a map: `{ value: string|number, ts: number }` — the REST API returns these as nested Firestore type objects
- US brand size charts (Loft, Ann Taylor, Amazon US) are assumed to be in inches unless the first measurement value is ≥ 50 (then assume cm)
- The FitMe GitHub Pages URL appears in `extension/config/sites.json` as `fitmeHost` — **verify this URL before testing**: it is likely `https://petergohrf.github.io/fitme` but confirm from the GitHub repo settings

---

## File Map

```
extension/
  manifest.json               MV3 config — permissions, content script matches, icons
  assets/
    icon-16.png               Extension toolbar icon (16×16)
    icon-48.png               Extension icon (48×48)
    icon-128.png              Extension icon (128×128)
  background/
    service-worker.js         Relays messages between popup/content and chrome.storage
  config/
    sites.json                fitmeHost URL + URL patterns per supported site
  content/
    auth-bridge.js            Runs on FitMe pages; extracts Clerk user ID → storage
    content.js                Runs on product pages; orchestrates full recommendation flow
    panel.css                 Styles for the floating recommendation panel
  popup/
    popup.html                "Sign in" / "Connected" states
    popup.js                  Reads storage state; opens FitMe tab on sign-in click
    popup.css                 Popup styles
  scripts/
    site-detector.js          detectSite(url) — returns site info or null
    jina-client.js            fetchPageMarkdown(url) — calls r.jina.ai
    size-parser.js            parseSizeChart(markdown) — extracts size chart object
    recommender.js            getRecommendation(chart, measurements) — size match logic
    firebase-client.js        fetchMeasurements(userId) — reads Firestore via REST
  tests/
    test-site-detector.html   Browser test page for site-detector.js
    test-size-parser.html     Browser test page for size-parser.js
    test-recommender.html     Browser test page for recommender.js
    fixtures/
      loft-sample.md          Real Jina output from a Loft product page (captured manually)
      amazon-sample.md        Real Jina output from an Amazon product page
      poshmark-sample.md      Real Jina output from a Poshmark listing
```

---

### Task 1: Extension scaffold + manifest.json

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/assets/icon-16.png`
- Create: `extension/assets/icon-48.png`
- Create: `extension/assets/icon-128.png`

**Interfaces:**
- Produces: a loadable Chrome extension with correct permissions declared

- [ ] **Step 1: Create the folder structure**

Create these empty folders (files are added in later tasks):
```
extension/assets/
extension/background/
extension/config/
extension/content/
extension/popup/
extension/scripts/
extension/tests/fixtures/
```

- [ ] **Step 2: Create placeholder icons**

Open Chrome, press F12 (DevTools), paste this in the Console tab, then right-click the generated image URL in the output and "Save as" three times with the correct sizes:

```js
function makeIcon(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', size / 2, size / 2);
  console.log(size + 'px:', c.toDataURL());
}
makeIcon(128); makeIcon(48); makeIcon(16);
```

Copy each data URL into the browser address bar, right-click the image → Save Image As → save to `extension/assets/icon-128.png`, `icon-48.png`, `icon-16.png`.

- [ ] **Step 3: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "FitMe — Know Your Size",
  "version": "0.1.0",
  "description": "See your recommended clothing size on Loft, Ann Taylor, Amazon, and Poshmark based on your FitMe measurements.",
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "*://*.loft.com/*",
    "*://*.anntaylor.com/*",
    "*://*.amazon.com/*",
    "*://*.poshmark.com/*",
    "https://r.jina.ai/*",
    "https://firestore.googleapis.com/*",
    "https://petergohrf.github.io/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "*://*.loft.com/*",
        "*://*.anntaylor.com/*",
        "*://*.amazon.com/*",
        "*://*.poshmark.com/*"
      ],
      "js": [
        "scripts/site-detector.js",
        "scripts/jina-client.js",
        "scripts/size-parser.js",
        "scripts/recommender.js",
        "scripts/firebase-client.js",
        "content/content.js"
      ],
      "css": ["content/panel.css"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://petergohrf.github.io/*"],
      "js": ["content/auth-bridge.js"],
      "run_at": "document_idle"
    }
  ]
}
```

**Note:** If the FitMe GitHub Pages URL differs from `https://petergohrf.github.io`, update both `host_permissions` and `content_scripts[1].matches` here, and `fitmeHost` in `config/sites.json` (Task 2).

- [ ] **Step 4: Load the extension in Chrome and verify it appears**

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked" → select the `extension/` folder
4. Expected: "FitMe — Know Your Size" appears in the list
5. There will be a service worker error (the file doesn't exist yet) — that's fine at this stage; ignore it

- [ ] **Step 5: Commit**

```bash
git add extension/
git commit -m "feat: scaffold Chrome extension structure and manifest"
```

---

### Task 2: Site detection

**Files:**
- Create: `extension/config/sites.json`
- Create: `extension/scripts/site-detector.js`
- Create: `extension/tests/test-site-detector.html`

**Interfaces:**
- Produces: `detectSite(url: string)` — returns `{ name: string, type: 'chart'|'tag-only' }` or `null`

- [ ] **Step 1: Write the failing test first**

Create `extension/tests/test-site-detector.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Site Detector Tests</title>
  <style>
    body { font-family: monospace; padding: 16px; }
    .pass { color: green; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
<h2>Site Detector Tests</h2>
<div id="results"></div>
<script src="../scripts/site-detector.js"></script>
<script>
const out = document.getElementById('results');
function assert(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  const div = document.createElement('div');
  div.className = pass ? 'pass' : 'fail';
  div.textContent = (pass ? '✓ ' : '✗ FAIL — ') + label
    + (pass ? '' : '\n  expected: ' + JSON.stringify(expected) + '\n  got:      ' + JSON.stringify(actual));
  out.appendChild(div);
}

assert('loft product page',
  detectSite('https://www.loft.com/linen-wide-leg-pant/product/14867453'),
  { name: 'loft', type: 'chart' });

assert('ann taylor product page',
  detectSite('https://www.anntaylor.com/the-julie-pant/product/590408'),
  { name: 'anntaylor', type: 'chart' });

assert('amazon product page',
  detectSite('https://www.amazon.com/dp/B09XYZ'),
  { name: 'amazon', type: 'chart' });

assert('poshmark listing',
  detectSite('https://poshmark.com/listing/Ann-Taylor-dress-123abc'),
  { name: 'poshmark', type: 'tag-only' });

assert('loft non-product page returns null',
  detectSite('https://www.loft.com/sale'), null);

assert('amazon search page returns null',
  detectSite('https://www.amazon.com/s?k=dress'), null);

assert('unsupported site returns null',
  detectSite('https://www.nordstrom.com/s/dress/123'), null);
</script>
</body>
</html>
```

- [ ] **Step 2: Open test in browser and confirm it fails**

Open `extension/tests/test-site-detector.html` in Chrome (File → Open File, or drag into a tab).
Expected: error about `detectSite` not being defined.

- [ ] **Step 3: Create config/sites.json**

Create `extension/config/sites.json`:

```json
{
  "fitmeHost": "https://petergohrf.github.io/fitme",
  "sites": [
    {
      "name": "loft",
      "type": "chart",
      "hostPattern": "loft\\.com",
      "productPattern": "/product/|/p/"
    },
    {
      "name": "anntaylor",
      "type": "chart",
      "hostPattern": "anntaylor\\.com",
      "productPattern": "/product/|/p/"
    },
    {
      "name": "amazon",
      "type": "chart",
      "hostPattern": "amazon\\.com",
      "productPattern": "/dp/|/gp/product/"
    },
    {
      "name": "poshmark",
      "type": "tag-only",
      "hostPattern": "poshmark\\.com",
      "productPattern": "/listing/"
    }
  ]
}
```

- [ ] **Step 4: Create scripts/site-detector.js**

Content scripts cannot `fetch()` local extension files, so the config is inlined. Create `extension/scripts/site-detector.js`:

```js
// Inlined from config/sites.json — keep in sync when sites.json changes.
const SITES_CONFIG = {
  fitmeHost: 'https://petergohrf.github.io/fitme',
  sites: [
    { name: 'loft',       type: 'chart',    hostPattern: 'loft\\.com',       productPattern: '/product/|/p/' },
    { name: 'anntaylor',  type: 'chart',    hostPattern: 'anntaylor\\.com',  productPattern: '/product/|/p/' },
    { name: 'amazon',     type: 'chart',    hostPattern: 'amazon\\.com',     productPattern: '/dp/|/gp/product/' },
    { name: 'poshmark',   type: 'tag-only', hostPattern: 'poshmark\\.com',   productPattern: '/listing/' },
  ]
};

function detectSite(url) {
  for (const site of SITES_CONFIG.sites) {
    if (new RegExp(site.hostPattern).test(url) && new RegExp(site.productPattern).test(url)) {
      return { name: site.name, type: site.type };
    }
  }
  return null;
}
```

- [ ] **Step 5: Refresh the test page and confirm all tests pass**

Refresh `extension/tests/test-site-detector.html`.
Expected: all 7 lines show ✓ in green.

- [ ] **Step 6: Commit**

```bash
git add extension/config/sites.json extension/scripts/site-detector.js extension/tests/test-site-detector.html
git commit -m "feat: add site detection for Loft, Ann Taylor, Amazon, Poshmark"
```

---

### Task 3: Jina AI client + real-world fixtures

**Files:**
- Create: `extension/scripts/jina-client.js`
- Create: `extension/tests/fixtures/loft-sample.md`
- Create: `extension/tests/fixtures/amazon-sample.md`
- Create: `extension/tests/fixtures/poshmark-sample.md`

**Interfaces:**
- Produces: `fetchPageMarkdown(url: string): Promise<string>` — returns markdown text on success, throws `Error` on failure

- [ ] **Step 1: Create jina-client.js**

Create `extension/scripts/jina-client.js`:

```js
async function fetchPageMarkdown(url) {
  const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(url);
  const response = await fetch(jinaUrl, { headers: { 'Accept': 'text/markdown' } });
  if (!response.ok) throw new Error('Jina fetch failed: ' + response.status + ' for ' + url);
  return response.text();
}
```

- [ ] **Step 2: Capture Loft fixture**

Open Chrome DevTools console on any page. Paste this (using a real Loft product URL):

```js
(async () => {
  const url = 'https://www.loft.com/linen-wide-leg-pant/product/14867453';
  const r = await fetch('https://r.jina.ai/' + encodeURIComponent(url), { headers: { Accept: 'text/markdown' } });
  const md = await r.text();
  console.log(md);
})();
```

Copy the full output. Save it as `extension/tests/fixtures/loft-sample.md`.
Look through it for a table with headers like "Size", "Bust", "Waist" — note whether such a table exists and what format it uses. If no size chart table appears, note this — it means the parser fallback will trigger for Loft and the site may need a different approach.

- [ ] **Step 3: Capture Amazon fixture**

Repeat with a real Amazon clothing product URL (e.g. a women's dress listing with a size chart):

```js
(async () => {
  const url = 'https://www.amazon.com/dp/REPLACE_WITH_REAL_ASIN';
  const r = await fetch('https://r.jina.ai/' + encodeURIComponent(url), { headers: { Accept: 'text/markdown' } });
  console.log(await r.text());
})();
```

Save as `extension/tests/fixtures/amazon-sample.md`.

- [ ] **Step 4: Capture Poshmark fixture**

Repeat with a real Poshmark listing URL. Expected: no size chart table, just the tag size mentioned in the listing text.

```js
(async () => {
  const url = 'https://poshmark.com/listing/REPLACE_WITH_REAL_LISTING_ID';
  const r = await fetch('https://r.jina.ai/' + encodeURIComponent(url), { headers: { Accept: 'text/markdown' } });
  console.log(await r.text());
})();
```

Save as `extension/tests/fixtures/poshmark-sample.md`.

- [ ] **Step 5: Commit**

```bash
git add extension/scripts/jina-client.js extension/tests/fixtures/
git commit -m "feat: add Jina AI Reader client and real-world fixture files"
```

---

### Task 4: Size chart parser

**Files:**
- Create: `extension/scripts/size-parser.js`
- Create: `extension/tests/test-size-parser.html`

**Interfaces:**
- Consumes: markdown string from `fetchPageMarkdown`
- Produces: `parseSizeChart(markdown: string): SizeChart | null`
  - `SizeChart` shape: `{ [sizeName: string]: { [measurement: string]: [number, number] } }`
  - Example: `{ "S": { bust: [34, 35], waist: [27, 28] }, "M": { bust: [36, 37], waist: [29, 30] } }`
  - Measurement keys are always lowercase: `bust`, `waist`, `hips`, `inseam`, `neck`, `thigh`, `shoulder`, `sleeve`
  - `chest` column headers are mapped to the key `bust`
  - Returns `null` if no size chart table is found

- [ ] **Step 1: Write the failing tests**

Create `extension/tests/test-size-parser.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Size Parser Tests</title>
  <style>
    body { font-family: monospace; padding: 16px; white-space: pre-wrap; }
    .pass { color: green; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
<h2>Size Parser Tests</h2>
<div id="results"></div>
<script src="../scripts/size-parser.js"></script>
<script>
const out = document.getElementById('results');
function assert(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  const div = document.createElement('div');
  div.className = pass ? 'pass' : 'fail';
  div.textContent = (pass ? '✓ ' : '✗ FAIL — ') + label
    + (pass ? '' : '\n  expected: ' + JSON.stringify(expected) + '\n  got:      ' + JSON.stringify(actual));
  out.appendChild(div);
}

// Test 1: en-dash range
assert('parses en-dash range table',
  parseSizeChart(`
| Size | Bust | Waist | Hips |
|------|------|-------|------|
| S | 34–35 | 27–28 | 37–38 |
| M | 36–37 | 29–30 | 39–40 |
`),
  { S: { bust: [34, 35], waist: [27, 28], hips: [37, 38] },
    M: { bust: [36, 37], waist: [29, 30], hips: [39, 40] } }
);

// Test 2: hyphen range
assert('parses hyphen range table',
  parseSizeChart(`
| Size | Bust | Waist |
|------|------|-------|
| XS | 32-33 | 25-26 |
`),
  { XS: { bust: [32, 33], waist: [25, 26] } }
);

// Test 3: no table
assert('returns null when no table', parseSizeChart('No chart here'), null);

// Test 4: irrelevant columns ignored
assert('ignores irrelevant columns',
  parseSizeChart(`
| Size | Color | Bust | Notes |
|------|-------|------|-------|
| M | Blue | 36–37 | Relaxed |
`),
  { M: { bust: [36, 37] } }
);

// Test 5: numeric sizes
assert('handles numeric sizes',
  parseSizeChart(`
| Size | Waist | Hips |
|------|-------|------|
| 6 | 27–28 | 37–38 |
| 8 | 29–30 | 39–40 |
`),
  { '6': { waist: [27, 28], hips: [37, 38] },
    '8': { waist: [29, 30], hips: [39, 40] } }
);

// Test 6: "Chest" header mapped to bust key
assert('maps Chest column to bust key',
  parseSizeChart(`
| Size | Chest | Waist |
|------|-------|-------|
| L | 38–40 | 31–33 |
`),
  { L: { bust: [38, 40], waist: [31, 33] } }
);
</script>
</body>
</html>
```

- [ ] **Step 2: Open the test and confirm it fails**

Open `extension/tests/test-size-parser.html` in Chrome.
Expected: an error in the console about `parseSizeChart` not being defined.

- [ ] **Step 3: Create size-parser.js**

Create `extension/scripts/size-parser.js`:

```js
const MEASUREMENT_KEYWORDS = {
  bust:     ['bust', 'chest'],
  waist:    ['waist'],
  hips:     ['hip', 'hips'],
  inseam:   ['inseam'],
  neck:     ['neck'],
  thigh:    ['thigh'],
  shoulder: ['shoulder'],
  sleeve:   ['sleeve'],
};

function parseSizeChart(markdown) {
  // Match markdown tables: header row | separator row | one-or-more data rows
  const tableRe = /\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)+)/g;
  let match;
  while ((match = tableRe.exec(markdown)) !== null) {
    const headers = match[1].split('|').map(h => h.trim().toLowerCase()).filter(Boolean);
    const colMap = buildColumnMap(headers);
    if (!colMap || Object.keys(colMap).length === 0) continue;

    const chart = {};
    for (const row of match[2].trim().split('\n')) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      const sizeName = cells[0];
      if (!sizeName || sizeName.startsWith('-')) continue;
      const entry = {};
      for (const [measurement, colIndex] of Object.entries(colMap)) {
        const range = parseRange(cells[colIndex]);
        if (range) entry[measurement] = range;
      }
      if (Object.keys(entry).length > 0) chart[sizeName] = entry;
    }
    if (Object.keys(chart).length > 0) return chart;
  }
  return null;
}

function buildColumnMap(headers) {
  const map = {};
  for (let i = 1; i < headers.length; i++) {
    for (const [measurement, keywords] of Object.entries(MEASUREMENT_KEYWORDS)) {
      if (keywords.some(kw => headers[i].includes(kw))) map[measurement] = i;
    }
  }
  return Object.keys(map).length > 0 ? map : null;
}

function parseRange(cell) {
  if (!cell) return null;
  const s = cell.replace(/["""'']/g, '').replace(/\s/g, '');
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)[–\-](\d+(?:\.\d+)?)$/);
  if (rangeMatch) return [parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2])];
  const singleMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) { const v = parseFloat(singleMatch[1]); return [v, v]; }
  return null;
}
```

- [ ] **Step 4: Run the tests**

Refresh `extension/tests/test-size-parser.html`.
Expected: all 6 tests show ✓ in green.

- [ ] **Step 5: Verify against the Loft fixture**

In DevTools console while the test page is open:

```js
fetch('../tests/fixtures/loft-sample.md')
  .then(r => r.text())
  .then(md => console.log(JSON.stringify(parseSizeChart(md), null, 2)));
```

Expected: a JSON object with size keys and measurement ranges. If the output is `null`, Jina did not return a parseable size chart for Loft — add a console.log call inside `parseSizeChart` to see which tables were found, and adjust the regex or keyword list to match the actual format. Add a new test case for any format discovered.

- [ ] **Step 6: Commit**

```bash
git add extension/scripts/size-parser.js extension/tests/test-size-parser.html
git commit -m "feat: add size chart parser with keyword-based column detection"
```

---

### Task 5: Recommendation engine

**Files:**
- Create: `extension/scripts/recommender.js`
- Create: `extension/tests/test-recommender.html`

**Interfaces:**
- Consumes:
  - `chart`: `SizeChart` from `parseSizeChart` — `{ [sizeName]: { [measurement]: [min, max] } }`
  - `measurements`: `{ [key: string]: number, unit: 'cm'|'in' }` — e.g. `{ bust: 36, waist: 29, hips: 39, unit: 'in' }`
- Produces: `getRecommendation(chart, measurements): Recommendation`
  - `Recommendation` shape:
    ```js
    {
      size: string | null,       // recommended size label, or null if out of range
      details: Array<{           // one entry per measured dimension that was used
        measurement: string,     // e.g. "bust"
        value: number,           // user's value in chart units (inches or cm)
        rangeLabel: string       // e.g. "36–37""
      }>,
      warning: string | null     // e.g. "Between sizes — sized up to L" or null
    }
    ```

- [ ] **Step 1: Write the failing tests**

Create `extension/tests/test-recommender.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Recommender Tests</title>
  <style>
    body { font-family: monospace; padding: 16px; white-space: pre-wrap; }
    .pass { color: green; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
<h2>Recommender Tests</h2>
<div id="results"></div>
<script src="../scripts/recommender.js"></script>
<script>
const out = document.getElementById('results');
function assertFields(label, actual, expected) {
  const pass = Object.keys(expected).every(k => JSON.stringify(actual[k]) === JSON.stringify(expected[k]));
  const div = document.createElement('div');
  div.className = pass ? 'pass' : 'fail';
  div.textContent = (pass ? '✓ ' : '✗ FAIL — ') + label
    + (pass ? '' : '\n  expected: ' + JSON.stringify(expected) + '\n  got:      ' + JSON.stringify(actual));
  out.appendChild(div);
}

const chart = {
  XS: { bust: [32, 33], waist: [25, 26], hips: [35, 36] },
  S:  { bust: [34, 35], waist: [27, 28], hips: [37, 38] },
  M:  { bust: [36, 37], waist: [29, 30], hips: [39, 40] },
  L:  { bust: [38, 40], waist: [31, 33], hips: [41, 43] },
};

// Test 1: perfect match
assertFields('perfect match → M, no warning',
  getRecommendation(chart, { bust: 36, waist: 29, hips: 39, unit: 'in' }),
  { size: 'M', warning: null });

// Test 2: between sizes — sizes up
assertFields('between M and L → sizes up to L',
  getRecommendation(chart, { bust: 37, waist: 31, hips: 40, unit: 'in' }),
  { size: 'L', warning: 'Between sizes — sized up to L' });

// Test 3: cm converted to inches before matching
// 91.44cm = 36in, 73.66cm = 29in, 99.06cm = 39in → M
assertFields('cm measurements → converts and matches M',
  getRecommendation(chart, { bust: 91.44, waist: 73.66, hips: 99.06, unit: 'cm' }),
  { size: 'M', warning: null });

// Test 4: out of range
assertFields('measurements outside all sizes → size null',
  getRecommendation(chart, { bust: 50, waist: 45, hips: 55, unit: 'in' }),
  { size: null, warning: "Your measurements are outside this chart's size range" });

// Test 5: partial measurements (only bust)
assertFields('partial measurements → recommends from what is available',
  getRecommendation(chart, { bust: 36, unit: 'in' }),
  { size: 'M', warning: null });
</script>
</body>
</html>
```

- [ ] **Step 2: Open the test and confirm it fails**

Open `extension/tests/test-recommender.html`.
Expected: error about `getRecommendation` not being defined.

- [ ] **Step 3: Create recommender.js**

Create `extension/scripts/recommender.js`:

```js
const CM_PER_INCH = 2.54;

function getRecommendation(chart, measurements) {
  const measurementKeys = Object.keys(measurements).filter(k => k !== 'unit');
  const chartUnit = detectChartUnit(chart);
  const userInChartUnits = toChartUnits(measurements, measurementKeys, chartUnit);
  const sizeOrder = Object.keys(chart);

  // Count how many of the user's measurements fall within each size range
  const scores = {};
  for (const size of sizeOrder) {
    let matches = 0, checked = 0;
    for (const key of measurementKeys) {
      const range = chart[size][key];
      if (!range) continue;
      checked++;
      if (userInChartUnits[key] >= range[0] && userInChartUnits[key] <= range[1]) matches++;
    }
    if (checked > 0) scores[size] = { matches, checked };
  }

  // Perfect match: all available measurements fit one size
  const perfect = sizeOrder.find(s => scores[s] && scores[s].matches === scores[s].checked);
  if (perfect) {
    return { size: perfect, details: buildDetails(chart[perfect], userInChartUnits, measurementKeys, chartUnit), warning: null };
  }

  // Partial match: find size with most hits, then size up
  const withMatches = sizeOrder.filter(s => scores[s] && scores[s].matches > 0);
  if (withMatches.length > 0) {
    const best = withMatches.reduce((a, b) => scores[b].matches > scores[a].matches ? b : a);
    const idx = sizeOrder.indexOf(best);
    const sizedUp = sizeOrder[idx + 1] || best;
    return {
      size: sizedUp,
      details: buildDetails(chart[sizedUp] || chart[best], userInChartUnits, measurementKeys, chartUnit),
      warning: 'Between sizes — sized up to ' + sizedUp,
    };
  }

  return { size: null, details: [], warning: "Your measurements are outside this chart's size range" };
}

function detectChartUnit(chart) {
  const firstRange = Object.values(Object.values(chart)[0])[0];
  return firstRange && firstRange[0] >= 50 ? 'cm' : 'in';
}

function toChartUnits(measurements, keys, chartUnit) {
  const result = {};
  for (const key of keys) {
    const val = parseFloat(measurements[key]);
    if (isNaN(val)) continue;
    if (measurements.unit === 'cm' && chartUnit === 'in') result[key] = val / CM_PER_INCH;
    else if (measurements.unit === 'in' && chartUnit === 'cm') result[key] = val * CM_PER_INCH;
    else result[key] = val;
  }
  return result;
}

function buildDetails(sizeRanges, userVals, keys, chartUnit) {
  return keys
    .filter(k => sizeRanges && sizeRanges[k])
    .map(k => ({
      measurement: k,
      value: Math.round(userVals[k] * 10) / 10,
      rangeLabel: sizeRanges[k][0] + '–' + sizeRanges[k][1] + (chartUnit === 'cm' ? 'cm' : '"'),
    }));
}
```

- [ ] **Step 4: Run the tests**

Refresh `extension/tests/test-recommender.html`.
Expected: all 5 tests show ✓ in green.

- [ ] **Step 5: Commit**

```bash
git add extension/scripts/recommender.js extension/tests/test-recommender.html
git commit -m "feat: add recommendation engine with unit conversion and size-up logic"
```

---

### Task 6: Firebase client

**Files:**
- Create: `extension/scripts/firebase-client.js`

**Interfaces:**
- Consumes: `userId: string` — the Clerk user ID (stored by the auth bridge in Task 8)
- Produces: `fetchMeasurements(userId: string): Promise<Measurements>`
  - `Measurements` shape: `{ bust?: number, waist?: number, hips?: number, inseam?: number, shoulder?: number, sleeve?: number, neck?: number, thigh?: number, unit: 'cm'|'in' }`
  - Any measurement not yet saved by the user will be absent from the object
  - `unit` defaults to `'in'` if not stored

Firestore document path: `users/{userId}` in project `fitme-prod-b672d`.
Firestore fields (each is a map `{ value: string|number, ts: number }`):
`fitme_chest`, `fitme_waist`, `fitme_hips`, `fitme_inseam`, `fitme_shoulder`, `fitme_sleeve`, `fitme_neck`, `fitme_thigh`, `fitme_unit`

- [ ] **Step 1: Create firebase-client.js**

Create `extension/scripts/firebase-client.js`:

```js
const FIREBASE_API_KEY  = 'AIzaSyCdF6UfLUXyY6uxZDk77Bg9cym3Pnvi9f0';
const FIREBASE_PROJECT  = 'fitme-prod-b672d';

// Maps Firestore field names → measurement keys used by the recommender
const FIELD_MAP = {
  fitme_chest:    'bust',
  fitme_waist:    'waist',
  fitme_hips:     'hips',
  fitme_inseam:   'inseam',
  fitme_shoulder: 'shoulder',
  fitme_sleeve:   'sleeve',
  fitme_neck:     'neck',
  fitme_thigh:    'thigh',
};

async function fetchMeasurements(userId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url);
  if (response.status === 404) return { unit: 'in' }; // user has no saved measurements yet
  if (!response.ok) throw new Error('Firestore fetch failed: ' + response.status);
  const doc = await response.json();
  return parseFirestoreDoc(doc);
}

function parseFirestoreDoc(doc) {
  const fields = doc.fields || {};
  const result = {};

  for (const [firestoreKey, measurementKey] of Object.entries(FIELD_MAP)) {
    const field = fields[firestoreKey];
    if (!field) continue;
    const val = extractFirestoreMapValue(field);
    if (val !== null && val !== undefined && val !== '') {
      result[measurementKey] = parseFloat(val);
    }
  }

  // Extract unit
  const unitField = fields['fitme_unit'];
  result.unit = unitField ? (extractFirestoreMapValue(unitField) || 'in') : 'in';
  return result;
}

// Firestore REST API wraps map fields as:
// { mapValue: { fields: { value: { stringValue|doubleValue|integerValue: ... }, ts: { ... } } } }
function extractFirestoreMapValue(field) {
  const mapFields = field?.mapValue?.fields;
  if (!mapFields) return null;
  const valueField = mapFields.value;
  if (!valueField) return null;
  return valueField.stringValue ?? valueField.doubleValue ?? valueField.integerValue ?? null;
}
```

- [ ] **Step 2: Manually test against a real user document**

You need a real Clerk user ID to test. After completing Task 8 (auth bridge), come back here and run in DevTools console on a product page:

```js
chrome.storage.local.get('fitme_user_id', async (result) => {
  const userId = result.fitme_user_id;
  console.log('User ID:', userId);
  const measurements = await fetchMeasurements(userId);
  console.log('Measurements:', measurements);
});
```

Expected: the measurements you saved in the FitMe app appear as a plain JavaScript object.

- [ ] **Step 3: Commit**

```bash
git add extension/scripts/firebase-client.js
git commit -m "feat: add Firebase Firestore REST client to fetch user measurements"
```

---

### Task 7: Background service worker

**Files:**
- Create: `extension/background/service-worker.js`

**Interfaces:**
- Message `{ type: 'STORE_USER_ID', userId: string }` → stores `userId` in `chrome.storage.local`; responds `{ ok: true }`
- Message `{ type: 'GET_USER_ID' }` → responds `{ userId: string | null }`
- Message `{ type: 'CLEAR_USER_ID' }` → removes stored user ID; responds `{ ok: true }`

- [ ] **Step 1: Create service-worker.js**

Create `extension/background/service-worker.js`:

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STORE_USER_ID') {
    chrome.storage.local.set({ fitme_user_id: message.userId }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'GET_USER_ID') {
    chrome.storage.local.get('fitme_user_id', (result) => {
      sendResponse({ userId: result.fitme_user_id || null });
    });
    return true;
  }

  if (message.type === 'CLEAR_USER_ID') {
    chrome.storage.local.remove('fitme_user_id', () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
```

- [ ] **Step 2: Reload the extension and verify the service worker starts**

1. Go to `chrome://extensions`
2. Click the refresh icon on the FitMe extension
3. Click the "Service Worker" link — a DevTools window opens
4. Expected: no errors in the console. The service worker is idle, waiting for messages.

- [ ] **Step 3: Commit**

```bash
git add extension/background/service-worker.js
git commit -m "feat: add background service worker for user ID storage"
```

---

### Task 8: Auth bridge (extracts Clerk user ID from the FitMe site)

**Files:**
- Create: `extension/content/auth-bridge.js`

**Interfaces:**
- Runs as a content script on FitMe GitHub Pages pages (matched in `manifest.json`)
- When Clerk is loaded and a user is signed in: sends `{ type: 'STORE_USER_ID', userId }` to the service worker
- When the user signs out: sends `{ type: 'CLEAR_USER_ID' }`

- [ ] **Step 1: Verify the manifest matches the correct FitMe URL**

Check `extension/manifest.json`. The second entry in `content_scripts` must match the real FitMe GitHub Pages URL. If it currently reads `https://petergohrf.github.io/*` but the real URL is different, update it now (also update `host_permissions` and `SITES_CONFIG.fitmeHost` in `site-detector.js`).

- [ ] **Step 2: Create auth-bridge.js**

Create `extension/content/auth-bridge.js`:

```js
function waitForClerk(maxMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = setInterval(() => {
      if (window.Clerk && window.Clerk.loaded) { clearInterval(check); resolve(window.Clerk); }
      else if (Date.now() - start > maxMs) { clearInterval(check); reject(new Error('Clerk timeout')); }
    }, 300);
  });
}

function syncUserId(clerk) {
  const userId = clerk.user ? clerk.user.id : null;
  if (userId) {
    chrome.runtime.sendMessage({ type: 'STORE_USER_ID', userId });
  } else {
    chrome.runtime.sendMessage({ type: 'CLEAR_USER_ID' });
  }
}

(async () => {
  try {
    const clerk = await waitForClerk(12000);
    syncUserId(clerk);
    clerk.addListener(() => syncUserId(clerk));
  } catch {
    // Clerk did not load — no FitMe account on this page, nothing to do
  }
})();
```

- [ ] **Step 3: Reload the extension and test the auth bridge**

1. Reload the extension at `chrome://extensions`
2. Navigate to the FitMe GitHub Pages site and sign in (if not already)
3. Open DevTools → Application tab → Storage → Extension Storage (left sidebar)
4. Expected: a `fitme_user_id` key appears with a value like `user_abc123xyz`
5. Sign out on the FitMe site
6. Expected: `fitme_user_id` is removed from extension storage

- [ ] **Step 4: Revisit Task 6 manual test**

Now run the manual test from Task 6 Step 2 to confirm `fetchMeasurements` returns your real saved measurements.

- [ ] **Step 5: Commit**

```bash
git add extension/content/auth-bridge.js
git commit -m "feat: add auth bridge to extract Clerk user ID from FitMe site"
```

---

### Task 9: Popup UI

**Files:**
- Create: `extension/popup/popup.html`
- Create: `extension/popup/popup.js`
- Create: `extension/popup/popup.css`

**Interfaces:**
- Reads: `{ type: 'GET_USER_ID' }` from service worker → `{ userId: string|null }`
- Writes: `{ type: 'CLEAR_USER_ID' }` to service worker on sign-out
- Opens FitMe site in a new tab when sign-in button is clicked (using `fitmeHost` from SITES_CONFIG — but SITES_CONFIG is not loaded in the popup, so hardcode the same URL)

- [ ] **Step 1: Create popup.html**

Create `extension/popup/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <span class="logo">👗</span>
    <span class="title">FitMe</span>
  </div>
  <div id="signed-out" class="section">
    <p class="message">Sign in to get size recommendations while you shop.</p>
    <button id="sign-in-btn" class="btn-primary">Sign in to FitMe</button>
  </div>
  <div id="signed-in" class="section hidden">
    <p class="status">Connected — recommendations are active.</p>
    <p class="sites">Loft · Ann Taylor · Amazon · Poshmark</p>
    <button id="sign-out-btn" class="btn-secondary">Sign out</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup.css**

Create `extension/popup/popup.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1f2937; }
.header { display: flex; align-items: center; gap: 8px; padding: 16px; background: #4f46e5; color: white; }
.logo { font-size: 20px; }
.title { font-weight: 700; font-size: 16px; }
.section { padding: 16px; }
.message, .status { line-height: 1.5; color: #374151; margin-bottom: 12px; }
.sites { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
.btn-primary { width: 100%; padding: 10px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #4338ca; }
.btn-secondary { width: 100%; padding: 8px; background: transparent; color: #6b7280; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary:hover { background: #f9fafb; }
.hidden { display: none; }
```

- [ ] **Step 3: Create popup.js**

Create `extension/popup/popup.js`:

```js
const FITME_HOST = 'https://petergohrf.github.io/fitme';

async function getUserId() {
  return new Promise(resolve =>
    chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => resolve(r?.userId || null))
  );
}

async function init() {
  const userId = await getUserId();
  if (userId) {
    document.getElementById('signed-out').classList.add('hidden');
    document.getElementById('signed-in').classList.remove('hidden');
  }
}

document.getElementById('sign-in-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: FITME_HOST });
  window.close();
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_USER_ID' }, () => {
    document.getElementById('signed-in').classList.add('hidden');
    document.getElementById('signed-out').classList.remove('hidden');
  });
});

init();
```

- [ ] **Step 4: Test the popup end-to-end**

1. Reload the extension at `chrome://extensions`
2. Click the FitMe extension icon in the toolbar
3. If not signed in to FitMe: expected "Sign in to FitMe" button appears
4. Click it — expected: FitMe site opens in a new tab
5. Sign in on FitMe
6. Return, click the extension icon again
7. Expected: "Connected — recommendations are active" state
8. Click "Sign out" → expected: reverts to signed-out state

- [ ] **Step 5: Commit**

```bash
git add extension/popup/
git commit -m "feat: add extension popup with sign-in and sign-out UI"
```

---

### Task 10: Content script + injected panel

**Files:**
- Create: `extension/content/panel.css`
- Create: `extension/content/content.js`

**Interfaces:**
- Consumes at runtime (all previously loaded via `manifest.json` content_scripts array): `detectSite`, `fetchPageMarkdown`, `parseSizeChart`, `getRecommendation`, `fetchMeasurements`
- Reads user ID: via `chrome.runtime.sendMessage({ type: 'GET_USER_ID' })`
- Produces: a `<div id="fitme-panel">` injected into `document.body`, fixed bottom-right corner

- [ ] **Step 1: Create panel.css**

Create `extension/content/panel.css`:

```css
#fitme-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 300px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #1f2937;
  z-index: 2147483647;
  overflow: hidden;
}
#fitme-panel .fm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #4f46e5;
  color: white;
  font-weight: 700;
  font-size: 13px;
}
#fitme-panel .fm-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  opacity: 0.8;
}
#fitme-panel .fm-close:hover { opacity: 1; }
#fitme-panel .fm-body { padding: 14px; }
#fitme-panel .fm-size {
  font-size: 18px;
  font-weight: 700;
  color: #4f46e5;
  margin-bottom: 10px;
}
#fitme-panel .fm-details { margin-bottom: 8px; }
#fitme-panel .fm-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #4b5563;
  padding: 2px 0;
}
#fitme-panel .fm-warning {
  font-size: 12px;
  color: #92400e;
  background: #fef3c7;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 8px;
}
#fitme-panel .fm-link {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #4f46e5;
  text-decoration: none;
  padding: 8px 0 2px;
  border-top: 1px solid #f3f4f6;
  margin-top: 4px;
}
#fitme-panel .fm-link:hover { text-decoration: underline; }
#fitme-panel .fm-message { font-size: 13px; color: #6b7280; line-height: 1.5; }
```

- [ ] **Step 2: Create content.js**

Create `extension/content/content.js`:

```js
const FITME_MANNEQUIN_URL = 'https://petergohrf.github.io/fitme/mannequin.html';

(async () => {
  const site = detectSite(window.location.href);
  if (!site) return;

  const userId = await new Promise(resolve =>
    chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => resolve(r?.userId || null))
  );

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
      fetchPageMarkdown(window.location.href),
      fetchMeasurements(userId),
    ]);
    chart = parseSizeChart(markdown);
  } catch {
    inject(errorPanel());
    return;
  }

  if (!chart) {
    console.info('[FitMe] No size chart found on', window.location.href);
    inject(noChartPanel(measurements));
    return;
  }

  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');
  inject(recommendationPanel(rec));
})();

function inject(html) {
  document.getElementById('fitme-panel')?.remove();
  const div = document.createElement('div');
  div.id = 'fitme-panel';
  div.innerHTML = html;
  document.body.appendChild(div);
  div.querySelector('.fm-close')?.addEventListener('click', () => div.remove());
}

function shell(body) {
  return `<div class="fm-header"><span>👗 FitMe</span><button class="fm-close" title="Dismiss">✕</button></div><div class="fm-body">${body}</div>`;
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function recommendationPanel(rec) {
  if (!rec.size) return shell(`<p class="fm-message">${rec.warning}</p>`);
  const rows = rec.details.map(d =>
    `<div class="fm-row"><span>${cap(d.measurement)}</span><span>${d.value} → ${d.rangeLabel}</span></div>`
  ).join('');
  const warn = rec.warning ? `<div class="fm-warning">${rec.warning}</div>` : '';
  return shell(`
    <div class="fm-size">Recommended: Size ${rec.size}</div>
    <div class="fm-details">${rows}</div>
    ${warn}
    <a class="fm-link" href="${FITME_MANNEQUIN_URL}" target="_blank">Preview on your FitMe mannequin →</a>
  `);
}

function signInPanel() {
  return shell(`<p class="fm-message">Sign in to FitMe to get size recommendations while you shop.</p>`);
}

function noChartPanel(measurements) {
  const rows = measurementRows(measurements);
  return shell(`<p class="fm-message">Couldn't read a size chart — here are your measurements to compare manually:</p><div class="fm-details">${rows}</div>`);
}

function tagOnlyPanel(measurements) {
  const rows = measurementRows(measurements);
  return shell(`<p class="fm-message">Poshmark shows a tag size only. Here are your measurements to compare:</p><div class="fm-details">${rows}</div>`);
}

function errorPanel() {
  return shell(`<p class="fm-message">Something went wrong fetching size data. Try refreshing the page.</p>`);
}

function measurementRows(measurements) {
  if (!measurements) return '';
  return Object.entries(measurements)
    .filter(([k]) => k !== 'unit')
    .map(([k, v]) => `<div class="fm-row"><span>${cap(k)}</span><span>${v}${measurements.unit}</span></div>`)
    .join('');
}
```

- [ ] **Step 3: Reload the extension and test on a Loft product page**

1. Reload extension at `chrome://extensions`
2. Navigate to a Loft product page, e.g. `https://www.loft.com/linen-wide-leg-pant/product/14867453`
3. Expected (signed in, measurements saved): a purple floating panel appears in the bottom-right showing a size recommendation
4. Expected (signed in, no size chart found): panel shows your raw measurements
5. Expected (not signed in): panel shows "Sign in to FitMe"
6. Click ✕ — panel disappears; refresh — panel reappears

- [ ] **Step 4: Test all four sites**

| Site | Test URL pattern | Expected panel |
|---|---|---|
| Loft | `loft.com/.../product/...` | Size recommendation or no-chart fallback |
| Ann Taylor | `anntaylor.com/.../product/...` | Size recommendation or no-chart fallback |
| Amazon | `amazon.com/dp/...` | Size recommendation or no-chart fallback |
| Poshmark | `poshmark.com/listing/...` | Tag-only measurement panel |
| Loft non-product | `loft.com/sale` | No panel at all |

- [ ] **Step 5: Commit**

```bash
git add extension/content/
git commit -m "feat: add content script and floating size recommendation panel"
```

---

### Task 11: End-to-end verification + Jina fallback monitoring

**Files:**
- No new files — this task verifies the full system across all four sites

**Interfaces:**
- No new interfaces — observability only

- [ ] **Step 1: Test 5 product pages per site, log the fallback rate**

For each site, open 5 different product pages. Check the DevTools console for `[FitMe]` log lines. Record results:

| Site | Pages tested | Size chart found | Fell back to measurements |
|---|---|---|---|
| Loft | 5 | ? | ? |
| Ann Taylor | 5 | ? | ? |
| Amazon | 5 | ? | ? |
| Poshmark | 5 | n/a (tag-only) | n/a |

- [ ] **Step 2: Evaluate results**

- If ≥ 4/5 pages on a site find a size chart: Jina is working well for that site.
- If < 3/5 pages find a size chart on a given site: note it as a known limitation. The fallback (showing raw measurements) still works, but the site may need a different approach in a future iteration — either direct DOM reading or a different API.

- [ ] **Step 3: Verify the dismiss button and no-injection on non-product pages**

- On a product page: click ✕, confirm panel disappears. Reload, confirm it reappears.
- Navigate to `loft.com/sale` or `amazon.com/s?k=dress`. Confirm no panel appears.

- [ ] **Step 4: Commit notes if any**

If you found sites where Jina consistently fails, add a comment to the top of `extension/scripts/jina-client.js`:

```js
// Known fallback sites (Jina returns no size chart): [list any here]
// To fix: consider direct DOM reading for these sites in a future task.
```

```bash
git add extension/scripts/jina-client.js
git commit -m "docs: note Jina fallback sites from end-to-end testing"
```

---

## Post-build Checklist (Chrome Web Store)

When ready to publish the extension publicly, these items are required:

- [ ] Privacy policy page disclosing that product page URLs are sent to Jina's servers (`r.jina.ai`) for size chart extraction
- [ ] Confirm `manifest.json` permissions list is minimal (currently: `storage`, `tabs` — do not add any others without a specific reason)
- [ ] Replace placeholder icons with final branded icons (16px, 48px, 128px)
- [ ] Write a Chrome Web Store description explaining what data is collected (Clerk user ID stored locally, product URLs sent to Jina) and why

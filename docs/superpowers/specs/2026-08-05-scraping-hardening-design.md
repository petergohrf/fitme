# FitMe Extension — Scraping Hardening & Auth/Lifecycle Fixes

**Date:** 2026-08-05  
**Status:** Approved

---

## Problem

The extension has two categories of failure:

**Scraping/parsing layer** — guaranteed failures and silent wrong data:
- Loft and Ann Taylor never produce a recommendation (Jina can't see JS-rendered charts)
- Amazon's DOM reader only covers one widget type (`sizeChartV2`); all other Amazon chart UIs fall through to "no chart found"
- Multi-row table headers cause the entire table to be skipped
- Empty mid-row cells shift column indices, producing wrong measurement-to-column mapping
- Cells with embedded units ("34 cm"), fractions ("34½"), and open-ended ranges ("34+") are silently dropped
- `buildColumnMap` hardcodes column 0 as the size name, breaks tables with a leading index column
- Unit detection reads one cell and guesses; a small first value (e.g. neck 14) can flip the whole chart from cm to in
- Non-ascending size order breaks the "size up" logic
- A user with no saved measurements gets "outside this chart's size range" instead of a helpful prompt
- A user with only one measurement saved gets an overconfident "perfect match" with no caveat

**Auth/lifecycle layer** — behavioral bugs:
- Stale `userId` in `chrome.storage.local` after sign-out: shopping tab keeps showing the old user's measurements
- Amazon SPA navigation doesn't re-trigger content scripts; panel shows stale data for the new product
- Extension context invalidated (after reload) shows a sign-in panel to a signed-in user
- `page-bridge.js` polls for `window.Clerk` indefinitely if Clerk never loads — memory leak

---

## Scope

**In scope:**
- Universal chart reader replacing site-specific and Jina-only paths
- Parser hardening (all six edge cases above)
- Recommender fixes (unit detection, size ordering, empty/partial measurements)
- Auth/lifecycle behavioral fixes
- Comprehensive three-tier test suite

**Out of scope:**
- Firestore API key security (public key, unauthenticated reads) — deferred
- Chrome Web Store listing, icons, privacy policy
- Phase 2 (3D mannequin) or any non-extension work

---

## Architecture

### Files changed

| File | Change |
|---|---|
| `extension/scripts/universal-chart-reader.js` | **New** — replaces `dom-chart-reader.js` and `jina-client.js` |
| `extension/scripts/dom-chart-reader.js` | **Deleted** |
| `extension/scripts/jina-client.js` | **Deleted** (logic folded into universal-chart-reader.js) |
| `extension/scripts/size-parser.js` | **Hardened in-place** |
| `extension/scripts/recommender.js` | **Fixed in-place** |
| `extension/content/content.js` | **Updated** — runFitMe(), SPA hook, AUTH_CHANGED, CONTEXT_INVALID |
| `extension/content/page-bridge.js` | **Updated** — max-attempts on Clerk poll |
| `extension/background/service-worker.js` | **Updated** — AUTH_CHANGED broadcast |
| `extension/manifest.json` | **Updated** — adds `"tabs"` permission |
| `extension/tests/test-*.html` | **Deleted** — replaced by unit + integration + e2e tests |

### Files untouched

`firebase-client.js`, `auth-bridge.js`, `site-detector.js`, `sites.json`, popup files, assets, `scripts/vendor/*`, all Phase 1/2 website files.

---

## Component Designs

### 1. Universal Chart Reader (`universal-chart-reader.js`)

Single exported function: `readSizeChart(url)` — returns `Promise<string|null>` (markdown or null).

**Phase 1 — Score existing DOM tables (instant)**

- Query all `<table>` elements currently in the DOM
- Score each by counting measurement keywords (`bust`, `chest`, `waist`, `hip`, `inseam`, `neck`, `thigh`, `shoulder`, `sleeve`) found in `<th>` cell text
- If best score ≥ 1: extract that table via `tableToMarkdown()` (colspan-aware) and return
- Threshold of 1 prevents matching generic non-size tables

**Phase 2 — Universal button finder + MutationObserver**

- Search all `<a>`, `<button>`, `[role="button"]`, `<summary>` for text matching `/(size|fit|sizing).*(chart|guide)|size chart/i`
- Score candidates: exact "size chart" phrase scores highest, "fit guide" next, "sizing" lowest
- Click the top-scoring candidate
- Attach a `MutationObserver` to `document.body` watching for `childList` changes in the subtree
- When any new `<table>` node is added: score it — if score ≥ 1, extract it, disconnect observer, return
- Hard timeout of 5000ms: disconnect observer and advance to Phase 3

**Phase 3 — Jina fallback**

- Relay to service worker via `chrome.runtime.sendMessage({ type: 'FETCH_JINA_MARKDOWN', url })`
- Return markdown string on success, `null` on failure
- Jina remains useful for genuinely static sites without bot detection

**`tableToMarkdown(table)` — colspan-aware replacement**

When iterating `tr.children`, read each cell's `colspan` attribute. If `colspan > 1`, repeat the cell value that many times in the output row. This keeps header column count aligned with data row column count.

**`content.js` change:** remove the `site.name === 'amazon'` branch. All chart-type sites call `readSizeChart(window.location.href)`. The `jina-client.js` import disappears; `dom-chart-reader.js` import disappears.

---

### 2. Parser Hardening (`size-parser.js`)

**Fix 1 — Multi-row headers**

Before `buildColumnMap`, scan rows in order until one contains ≥ 1 measurement keyword. Use that row as the header; treat all rows above it as title/group rows and skip them. This handles "Measurements in cm" above "Bust | Waist | Hip".

**Fix 2 — Empty cells preserve column positions**

Replace:
```js
const cells = row.split('|').map(c => c.trim()).filter(Boolean);
```
With:
```js
const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
```
Empty cells become empty strings and stay in position. `colMap` indices remain accurate.

**Fix 3 — Embedded units in cells**

In `parseRange`, before running regexes, strip trailing unit tokens:
```js
s = s.replace(/\s*(cm|in|inches?|")\s*$/i, '');
```
Handles: "34 cm", "34-36 in", '14"'.

**Fix 4 — Fractions**

In `parseRange`, before regexes, normalise Unicode fraction characters:
```js
s = s.replace(/½/g, '.5').replace(/¼/g, '.25').replace(/¾/g, '.75');
```

**Fix 5 — Open-ended ranges**

In `parseRange`, after fraction normalisation, add two patterns:
- `"34+"` → `[34, 999]`  (sentinel upper bound: "no upper limit")
- `"up to 34"` → `[0, 34]`  (sentinel lower bound: "no lower limit")

The recommender's `>=` / `<=` comparisons work correctly against sentinel values.

**Fix 6 — Size name column by exclusion**

`buildColumnMap` changes its loop start from `i = 1` to: find the first column index whose header does not match any measurement keyword — that column is the size name column. All other matching columns map to measurements. Handles tables with a leading numeric index, a blank column, or an extra label column.

---

### 3. Recommender Fixes (`recommender.js`)

**Fix 1 — Unit detection: full-table scan**

Replace `detectChartUnit` single-cell check with:
1. Scan all header cell text for the strings `cm`, `centimeter`, `in`, `inch`, `inches`, `"`. First match wins.
2. If no unit string found: collect all numeric range values across the entire chart, take the median. Median > 50 → `'cm'`, otherwise `'in'`.

**Fix 2 — No measurements sentinel**

Before scoring logic:
```js
if (measurementKeys.length === 0) {
  return { size: null, noMeasurements: true, details: [], warning: null };
}
```
`content.js` handles `rec.noMeasurements === true` with a dedicated panel message: *"Save your measurements on FitMe to get size recommendations."*

**Fix 3 — Partial measurements coverage warning**

After finding a perfect match, count `checked` (measurements present in both user profile and chart) vs. `chartColumnCount` (total measurement columns in chart). If `checked < Math.ceil(chartColumnCount / 2)`, append: `warning: "Matched on ${checked} of ${chartColumnCount} measurements — save more for a better result."`

**Fix 4 — Size order normalisation**

After `const sizeOrder = Object.keys(chart)`:

```js
const ALPHA_SIZE_ORDER = ['XXS','XS','S','M','L','XL','XXL','XXXL','1X','2X','3X','4X'];

function normaliseSizeOrder(keys) {
  if (keys.every(k => !isNaN(Number(k)))) {
    return [...keys].sort((a, b) => Number(a) - Number(b));
  }
  const upperKeys = keys.map(k => k.toUpperCase());
  if (upperKeys.every(k => ALPHA_SIZE_ORDER.includes(k))) {
    return [...keys].sort((a, b) =>
      ALPHA_SIZE_ORDER.indexOf(a.toUpperCase()) - ALPHA_SIZE_ORDER.indexOf(b.toUpperCase())
    );
  }
  return keys; // unknown ordering — leave as-is
}
```

---

### 4. Content Script Lifecycle (`content.js`)

**Extract `runFitMe()`**

The current top-level IIFE becomes `async function runFitMe()`. Called once on `document_idle`. Also called by SPA hook and AUTH_CHANGED listener.

**SPA navigation hook**

Installed once after initial `runFitMe()` completes:

```js
function installSpaHook() {
  if (window.__fitme_spa_hook) return; // idempotent
  window.__fitme_spa_hook = true;
  const orig = history.pushState.bind(history);
  history.pushState = function(...args) { orig(...args); onUrlChange(); };
  window.addEventListener('popstate', onUrlChange);
}

function onUrlChange() {
  setTimeout(() => {
    const site = detectSite(window.location.href);
    if (!site) { document.getElementById('fitme-panel')?.remove(); return; }
    runFitMe();
  }, 800); // React re-render budget
}
```

800ms delay gives React/Vue time to render the new product before the chart reader runs.

**AUTH_CHANGED listener**

```js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'AUTH_CHANGED') runFitMe();
});
```

**CONTEXT_INVALID handling**

`GET_USER_ID` resolves to the string `'CONTEXT_INVALID'` on both `catch` and `chrome.runtime.lastError`. Checked before the null check; renders `refreshPanel()`: *"Extension was updated — please refresh this page to get size recommendations."*

---

### 5. Auth Broadcast (`service-worker.js` + `manifest.json`)

**`service-worker.js`** — after `CLEAR_USER_ID` removes the stored userId, broadcast to all matching tabs:

```js
const SHOPPING_PATTERNS = [
  '*://*.loft.com/*', '*://*.anntaylor.com/*',
  '*://*.amazon.com/*', '*://*.poshmark.com/*'
];

chrome.tabs.query({ url: SHOPPING_PATTERNS }, (tabs) => {
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: 'AUTH_CHANGED' }).catch(() => {});
  }
});
```

`SHOPPING_PATTERNS` mirrors `manifest.json` `matches` — single source of truth via a shared constant at the top of the file.

**`manifest.json`** — add `"tabs"` to `permissions` array. Also update `content_scripts[0].js`: remove `"scripts/jina-client.js"` and `"scripts/dom-chart-reader.js"`, add `"scripts/universal-chart-reader.js"` in their place.

---

### 6. Clerk Polling Leak (`page-bridge.js`)

Add a max-attempts counter to `waitForClerk`:

```js
function waitForClerk(attemptsLeft) {
  if (attemptsLeft <= 0) return;
  if (window.Clerk && window.Clerk.loaded) {
    sendState();
    window.Clerk.addListener(sendState);
  } else {
    setTimeout(() => waitForClerk(attemptsLeft - 1), 300);
  }
}
waitForClerk(100); // 30 seconds max
```

The two `setTimeout(sendState, 2000/5000)` catch-up calls are kept — they're cheap and cover slow Clerk loads within the window.

---

## Test Suite

### Tier 1 — Unit tests (`node --test`)

Run with: `node --test extension/tests/unit/*.test.js`

```
extension/tests/unit/
  size-parser.test.js
  recommender.test.js
  site-detector.test.js
```

**`size-parser.test.js` cases:**
- Standard clean single-row header → correct chart object
- Two-row header (group row + measurement row) → finds measurement row, skips group row
- Empty mid-row cells → column indices unchanged after empty cell
- Cells with embedded units ("34 cm", "34-36 in", '14"') → values parsed correctly
- Fraction cells ("34½", "36¼") → parsed as 34.5, 36.25
- Open-ended range "34+" → [34, 999]
- Open-ended range "up to 34" → [0, 34]
- Leading index column → size name column found by exclusion, not position
- No measurement keyword columns → returns null
- Multiple tables in markdown → first matching table returned

**`recommender.test.js` cases:**
- Chart with "cm" in header text → detectChartUnit returns 'cm'
- Chart with '"' in header text → detectChartUnit returns 'in'
- Chart with no unit text, all values > 50 → detectChartUnit returns 'cm'
- Chart with no unit text, small neck value first → median approach returns correct unit
- No saved measurements → `{ noMeasurements: true }` sentinel returned
- Partial measurements (1 of 5 chart columns) → perfect match + coverage warning
- Between-sizes (existing test 6 scenario) → sizes up with correct warning
- Beyond largest size (existing test 7 scenario) → warning, no crash
- Non-ascending alpha sizes → sorted before use, correct recommendation
- Non-ascending numeric sizes → sorted numerically

**`site-detector.test.js` cases:**
- Each of the four known sites → correct name/type returned
- Amazon sponsored link (`/sspa/click`) → returns null
- Amazon international (`.co.uk`) → returns null (expected miss, documented)
- Non-matching URL → returns null

### Tier 2 — Integration tests (Playwright + fixtures)

Run with: `npx playwright test extension/tests/integration`

```
extension/tests/integration/
  universal-chart-reader.test.js
extension/tests/fixtures/
  inline-chart.html          — table already in DOM, measurement headers
  lazy-chart.html            — "Size Chart" button reveals table on click
  colspan-header.html        — header row has colspan=2
  multi-row-header.html      — "Measurements" group row above real header
  empty-cells.html           — mid-row empty cells
  embedded-units.html        — cells with "34 cm", "34-36 in"
  open-ended.html            — cells with "34+", "up to 34"
  no-chart.html              — page with tables but none scoring ≥ 1
  no-table.html              — page with no tables at all
```

**`universal-chart-reader.test.js` cases:**
- `inline-chart.html` → Phase 1 returns chart markdown, Phase 2/3 not reached
- `lazy-chart.html` → Phase 1 scores 0, Phase 2 clicks button, MutationObserver fires, chart returned
- `colspan-header.html` → header column count matches data column count after colspan expansion
- `multi-row-header.html` → correct measurement row detected despite group row above
- `no-chart.html` → Phase 1/2 both score 0, falls through to Phase 3 (Jina mocked to return null)
- `no-table.html` → Phase 1/2 return null, Phase 3 mock returns null → overall null

### Tier 3 — E2E live-site tests (Playwright + real extension)

Run with: `FITME_E2E=1 npx playwright test extension/tests/e2e`  
Skipped unless `FITME_E2E=1` env var set.

**Auth strategy:** inject fake `fitme_user_id` into `chrome.storage.local` via the service worker; intercept Firestore REST calls via `context.route()` returning a canned profile (bust 92cm, waist 74cm, hips 99cm, inseam 76cm, shoulder 38cm, sleeve 60cm, neck 36cm, thigh 58cm).

**Assertions:** panel appears within 8 seconds; contains a size label; no error panel shown.

```
extension/tests/e2e/
  amazon.e2e.js
  loft.e2e.js
  anntaylor.e2e.js
  poshmark.e2e.js
  helpers/
    load-extension.js    — launchPersistentContext with --load-extension
    mock-auth.js         — injects userId + routes Firestore
  urls.json              — stable product URLs per site, updated without touching test code
```

---

## Multi-Agent Implementation Split

Three agents can work in parallel; dependencies are at interfaces only.

| Agent | Files | Dependency |
|---|---|---|
| A — Chart Reader | `universal-chart-reader.js`, `content.js` (chart path), integration tests, fixtures | None |
| B — Parser + Recommender | `size-parser.js`, `recommender.js`, unit tests | Interface: `readSizeChart()` returns markdown string — Agent A owns this contract |
| C — Auth/Lifecycle | `content.js` (lifecycle), `page-bridge.js`, `service-worker.js`, `manifest.json`, e2e helpers | Interface: `runFitMe()` function exists in content.js — Agent A and C both touch content.js, coordinate via merge |

Agent C touches `content.js` for lifecycle concerns (SPA hook, AUTH_CHANGED, CONTEXT_INVALID). Agent A touches `content.js` for the chart-reading path (remove amazon branch, call `readSizeChart`). These are distinct sections of the file and should not conflict, but the plan will note the overlap explicitly.

---

## Success Criteria

- Loft and Ann Taylor: extension shows a size recommendation on a product page with a size chart
- Amazon: extension works on at least 3 different product categories (not just sizeChartV2)
- All unit tests pass: `node --test extension/tests/unit/*.test.js`
- All integration tests pass with fixtures
- E2E tests pass on at least 2 product URLs per supported site
- No user with saved measurements sees "outside this chart's size range" unless they genuinely are
- A user with no saved measurements sees the "save your measurements" prompt, not an error

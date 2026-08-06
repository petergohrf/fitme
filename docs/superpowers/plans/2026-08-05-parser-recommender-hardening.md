# Parser + Recommender Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six silent-failure bugs in `size-parser.js` and four bugs in `recommender.js`, and replace the three ad-hoc HTML test files with a comprehensive `node:test` unit test suite.

**Architecture:** All changes are in-place rewrites of two existing files. `parseSizeChart` is redesigned to scan all rows for measurement keywords (fixing multi-row headers), preserve empty cells (fixing column index drift), strip units/fractions/open-ended ranges from cells (fixing silent parseRange drops), and find the size-name column by exclusion (fixing the hardcoded column-0 assumption). `getRecommendation` gains a no-measurements sentinel, a partial-match coverage warning, size order normalisation, and improved unit detection via median.

**Tech Stack:** Vanilla JS (ES5-compatible), Node.js built-in `node:test` module (Node 18+, no extra packages needed).

## Global Constraints

- No npm dependencies — use `node:test` and `node:assert/strict` (both built-in since Node 18)
- Run tests with: `node --test extension/tests/unit/size-parser.test.js` and `node --test extension/tests/unit/recommender.test.js`
- Do NOT use ES module `import` syntax — use `require()`
- `size-parser.js` and `recommender.js` must still work in a browser (no top-level `require`)
- Add `module.exports` at the bottom of each file, guarded by `typeof module !== 'undefined'`
- This plan is fully parallel with Plan A (Universal Chart Reader) — they touch different files

---

### Task B-1: Add `module.exports` to both files + scaffold unit test files

**Files:**
- Modify: `extension/scripts/size-parser.js` (add exports guard at bottom)
- Modify: `extension/scripts/recommender.js` (add exports guard at bottom)
- Create: `extension/tests/unit/size-parser.test.js`
- Create: `extension/tests/unit/recommender.test.js`
- Create: `extension/tests/unit/site-detector.test.js`

**Interfaces:**
- Produces: exported functions available for unit testing without a browser

- [ ] **Step 1: Add exports guard to the bottom of `extension/scripts/size-parser.js`**

Append to the very end of the file:
```js
// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { parseSizeChart, buildColumnMap, parseRange };
}
```

- [ ] **Step 2: Add exports guard to the bottom of `extension/scripts/recommender.js`**

Append to the very end of the file:
```js
// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { getRecommendation, detectChartUnit };
}
```

- [ ] **Step 3: Verify exports work in Node**

```
node -e "const m = require('./extension/scripts/size-parser.js'); console.log(Object.keys(m));"
```
Expected output: `[ 'parseSizeChart', 'buildColumnMap', 'parseRange' ]`

```
node -e "const m = require('./extension/scripts/recommender.js'); console.log(Object.keys(m));"
```
Expected output: `[ 'getRecommendation', 'detectChartUnit' ]`

- [ ] **Step 4: Create `extension/tests/unit/size-parser.test.js` with a smoke test**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSizeChart, parseRange } = require('../../scripts/size-parser.js');

test('smoke: parseSizeChart returns null for empty string', () => {
  assert.equal(parseSizeChart(''), null);
});

test('smoke: parseRange handles a simple range', () => {
  assert.deepEqual(parseRange('32-34'), [32, 34]);
});
```

- [ ] **Step 5: Create `extension/tests/unit/recommender.test.js` with a smoke test**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRecommendation, detectChartUnit } = require('../../scripts/recommender.js');

const SIMPLE_CHART = {
  S: { bust: [32, 34], waist: [25, 27] },
  M: { bust: [35, 37], waist: [28, 30] },
  L: { bust: [38, 40], waist: [31, 33] },
};

test('smoke: getRecommendation returns a size for a matching profile', () => {
  const result = getRecommendation(SIMPLE_CHART, { bust: 36, waist: 29, unit: 'in' });
  assert.equal(result.size, 'M');
});
```

- [ ] **Step 6: Create `extension/tests/unit/site-detector.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectSite } = require('../../scripts/site-detector.js');

test('detects loft product page', () => {
  const site = detectSite('https://www.loft.com/petite-classic-crew-neck-tee/517421.html');
  assert.equal(site.name, 'loft');
  assert.equal(site.type, 'chart');
});

test('detects anntaylor product page', () => {
  const site = detectSite('https://www.anntaylor.com/linen-blazer/p/497234');
  assert.equal(site.name, 'anntaylor');
});

test('detects amazon product page', () => {
  const site = detectSite('https://www.amazon.com/dp/B09XYZ12345');
  assert.equal(site.name, 'amazon');
});

test('detects poshmark listing', () => {
  const site = detectSite('https://poshmark.com/listing/Calvin-Klein-Dress-60a123abc456');
  assert.equal(site.name, 'poshmark');
  assert.equal(site.type, 'tag-only');
});

test('returns null for amazon sponsored link', () => {
  assert.equal(detectSite('https://www.amazon.com/sspa/click?url=%2Fdp%2FB09XYZ'), null);
});

test('returns null for non-product amazon page', () => {
  assert.equal(detectSite('https://www.amazon.com/'), null);
});

test('returns null for unrecognised site', () => {
  assert.equal(detectSite('https://www.nordstrom.com/s/dress/1234567'), null);
});
```

Note: `site-detector.js` needs the same `module.exports` guard. Add it now:
```js
if (typeof module !== 'undefined') {
  module.exports = { detectSite };
}
```

- [ ] **Step 7: Run all unit tests**

```
node --test extension/tests/unit/size-parser.test.js
node --test extension/tests/unit/recommender.test.js
node --test extension/tests/unit/site-detector.test.js
```
Expected: all smoke tests pass. Fix any import/export issues before continuing.

- [ ] **Step 8: Commit**

```
git add extension/scripts/size-parser.js extension/scripts/recommender.js extension/scripts/site-detector.js extension/tests/unit/
git commit -m "test(extension): scaffold node:test unit test suite with module.exports guards"
```

---

### Task B-2: Rewrite `parseSizeChart` — multi-row headers + empty cells + column-by-exclusion

These three fixes require restructuring `parseSizeChart` itself; doing them together is cleaner than three separate patches.

**Files:**
- Modify: `extension/scripts/size-parser.js`
- Modify: `extension/tests/unit/size-parser.test.js`

**Interfaces:**
- Produces: `parseSizeChart(markdown)` — same signature, handles multi-row headers and empty cells

- [ ] **Step 1: Add failing tests for all three fixes**

Add to `extension/tests/unit/size-parser.test.js`:

```js
// --- Fix 1: multi-row headers ---
test('multi-row header: finds measurement row when group row is above it', () => {
  // Simulates what tableToMarkdown produces for a <thead> with a group row + measurement row
  const markdown =
    '| Measurements in Inches | Measurements in Inches | Measurements in Inches | Measurements in Inches |\n' +
    '| --- | --- | --- | --- |\n' +
    '| Size | Bust | Waist | Hips |\n' +
    '| S | 34-35 | 26-27 | 36-37 |\n' +
    '| M | 36-37 | 28-29 | 38-39 |\n';
  const chart = parseSizeChart(markdown);
  assert.ok(chart, 'chart should not be null');
  assert.ok(chart.S, 'size S should exist');
  assert.deepEqual(chart.S.bust, [34, 35]);
  assert.deepEqual(chart.S.waist, [26, 27]);
});

// --- Fix 2: empty cells preserve column positions ---
test('empty cells: column indices are correct after an empty mid-row cell', () => {
  // A chart where size S has no thigh measurement (empty cell) but size M does
  const markdown =
    '| Size | Bust | Waist | Thigh |\n' +
    '| --- | --- | --- | --- |\n' +
    '| S | 34-35 | 26-27 |  |\n' +
    '| M | 36-37 | 28-29 | 22-23 |\n';
  const chart = parseSizeChart(markdown);
  assert.ok(chart, 'chart should not be null');
  // S should have bust and waist but not thigh
  assert.deepEqual(chart.S.bust, [34, 35]);
  assert.deepEqual(chart.S.waist, [26, 27]);
  assert.equal(chart.S.thigh, undefined);
  // M should have all three including thigh — column index must not have shifted
  assert.deepEqual(chart.M.thigh, [22, 23]);
});

// --- Fix 3: size name column by exclusion ---
test('column exclusion: finds size name when a numeric index column precedes it', () => {
  // Table has a leading index column: # | Size | Bust | Waist
  const markdown =
    '| # | Size | Bust | Waist |\n' +
    '| --- | --- | --- | --- |\n' +
    '| 1 | S | 34-35 | 26-27 |\n' +
    '| 2 | M | 36-37 | 28-29 |\n';
  // With the old code (i=1 hardcoded), colMap would treat "Size" as a measurement keyword miss
  // and map bust to col 2, waist to col 3. Data col 0 = "1", col 1 = "S", col 2 = "34-35", col 3 = "26-27"
  // The fix: find the first column whose header is NOT a measurement keyword → that's col 0 (#),
  // then treat col 1 (Size) as the size name column.
  // Actually: buildColumnMap should find bust at col 2, waist at col 3.
  // parseSizeChart should use col 0 or col 1 as size name.
  // The simplest correct behaviour: find the first non-measurement column = col 0 (#),
  // and the "size name" is cells[sizeNameColIdx]. But col 0 = "1", col 1 = "S" — we want "S".
  // Better: size name column = first non-measurement column that is NOT a pure number in data rows.
  // For simplicity in the spec: the size name is taken from the first column whose header
  // does not match any measurement keyword. That gives col 0 (#) with value "1", which is wrong.
  // 
  // REVISED APPROACH: size name column = last non-measurement header column before the first
  // measurement header column. In "# | Size | Bust | Waist": first measurement is at col 2,
  // so the last non-measurement before col 2 is col 1 (Size). Use that.
  const chart = parseSizeChart(markdown);
  assert.ok(chart, 'chart should not be null');
  assert.ok(chart.S, 'S should be a size key, not "1"');
  assert.deepEqual(chart.S.bust, [34, 35]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
node --test extension/tests/unit/size-parser.test.js
```
Expected: the three new tests fail. The smoke tests should still pass.

- [ ] **Step 3: Rewrite `parseSizeChart` and `buildColumnMap` in `size-parser.js`**

Replace the entire `parseSizeChart` function and `buildColumnMap` with:

```js
function parseSizeChart(markdown) {
  // Collect groups of pipe-table lines
  var lines = markdown.split('\n');
  var tables = [];
  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (trimmed.charAt(0) === '|') {
      if (!current) current = [];
      current.push(trimmed);
    } else {
      if (current && current.length >= 3) tables.push(current);
      current = null;
    }
  }
  if (current && current.length >= 3) tables.push(current);

  for (var t = 0; t < tables.length; t++) {
    var tableLines = tables[t];

    // Parse rows: strip outer pipes, split by |, trim — preserve empty cells (no filter)
    var rows = tableLines
      .map(function (line) {
        return line.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      })
      .filter(function (cells) {
        // Skip separator rows (all cells are dashes/spaces)
        return !cells.every(function (c) { return /^[-\s:]*$/.test(c); });
      });

    if (rows.length < 2) continue;

    // Find the first row that contains at least one measurement keyword
    var headerRowIdx = -1;
    var colMap = null;
    for (var r = 0; r < rows.length; r++) {
      colMap = buildColumnMap(rows[r]);
      if (colMap) { headerRowIdx = r; break; }
    }
    if (headerRowIdx < 0) continue;

    var headerRow = rows[headerRowIdx];
    var sizeColIdx = findSizeNameColumnIndex(headerRow, colMap);

    // Parse all rows after the header row as data rows
    var chart = {};
    for (var d = headerRowIdx + 1; d < rows.length; d++) {
      var cells = rows[d];
      var sizeName = cells[sizeColIdx];
      if (!sizeName) continue;
      var entry = {};
      for (var measurement in colMap) {
        if (!Object.prototype.hasOwnProperty.call(colMap, measurement)) continue;
        var range = parseRange(cells[colMap[measurement]]);
        if (range) entry[measurement] = range;
      }
      if (Object.keys(entry).length > 0) chart[sizeName] = entry;
    }
    if (Object.keys(chart).length > 0) return chart;
  }
  return null;
}

function buildColumnMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase();
    for (var measurement in MEASUREMENT_KEYWORDS) {
      if (!Object.prototype.hasOwnProperty.call(MEASUREMENT_KEYWORDS, measurement)) continue;
      var keywords = MEASUREMENT_KEYWORDS[measurement];
      if (keywords.some(function (kw) { return h.indexOf(kw) !== -1; })) {
        map[measurement] = i;
      }
    }
  }
  return Object.keys(map).length > 0 ? map : null;
}

// Returns the index of the size-name column: the last non-measurement column
// before the first measurement column. Falls back to column 0.
function findSizeNameColumnIndex(headerRow, colMap) {
  var measurementCols = Object.values(colMap);
  var firstMeasurementCol = Math.min.apply(null, measurementCols);
  // Walk backwards from the first measurement column to find the last non-measurement column
  for (var i = firstMeasurementCol - 1; i >= 0; i--) {
    if (measurementCols.indexOf(i) === -1) return i;
  }
  return 0;
}
```

Update the `module.exports` guard to include the new helper:
```js
if (typeof module !== 'undefined') {
  module.exports = { parseSizeChart, buildColumnMap, parseRange, findSizeNameColumnIndex };
}
```

- [ ] **Step 4: Run tests**

```
node --test extension/tests/unit/size-parser.test.js
```
Expected: all tests pass including the three new ones.

- [ ] **Step 5: Commit**

```
git add extension/scripts/size-parser.js extension/tests/unit/size-parser.test.js
git commit -m "fix(extension): rewrite parseSizeChart — multi-row headers, empty cells, size-col exclusion"
```

---

### Task B-3: Fix `parseRange` — embedded units, fractions, open-ended ranges

**Files:**
- Modify: `extension/scripts/size-parser.js`
- Modify: `extension/tests/unit/size-parser.test.js`

**Interfaces:**
- Consumes: `parseRange(cell)` — same signature
- Produces: handles "34 cm", "34-36 in", '14"', "34½", "34+", "up to 34"

- [ ] **Step 1: Add failing tests**

Add to `extension/tests/unit/size-parser.test.js`:

```js
// --- Fix: embedded units ---
test('parseRange: strips trailing cm unit', () => {
  assert.deepEqual(parseRange('34 cm'), [34, 34]);
});
test('parseRange: strips range with cm unit', () => {
  assert.deepEqual(parseRange('34-36 cm'), [34, 36]);
});
test('parseRange: strips trailing in unit', () => {
  assert.deepEqual(parseRange('14 in'), [14, 14]);
});
test('parseRange: strips trailing inches unit', () => {
  assert.deepEqual(parseRange('34-36 inches'), [34, 36]);
});
test('parseRange: strips trailing double-quote inch symbol', () => {
  assert.deepEqual(parseRange('14"'), [14, 14]);
});

// --- Fix: fractions ---
test('parseRange: handles ½ fraction', () => {
  assert.deepEqual(parseRange('34½'), [34.5, 34.5]);
});
test('parseRange: handles ¼ fraction', () => {
  assert.deepEqual(parseRange('36¼'), [36.25, 36.25]);
});
test('parseRange: handles ¾ fraction', () => {
  assert.deepEqual(parseRange('35¾'), [35.75, 35.75]);
});
test('parseRange: handles fraction in range', () => {
  assert.deepEqual(parseRange('34½-36'), [34.5, 36]);
});

// --- Fix: open-ended ranges ---
test('parseRange: handles open-ended high "34+"', () => {
  assert.deepEqual(parseRange('34+'), [34, 999]);
});
test('parseRange: handles open-ended low "up to 34"', () => {
  assert.deepEqual(parseRange('up to 34'), [0, 34]);
});

// --- Existing behaviour still works ---
test('parseRange: standard range', () => {
  assert.deepEqual(parseRange('32-34'), [32, 34]);
});
test('parseRange: single value', () => {
  assert.deepEqual(parseRange('30'), [30, 30]);
});
test('parseRange: returns null for non-numeric', () => {
  assert.equal(parseRange('N/A'), null);
});
test('parseRange: returns null for empty string', () => {
  assert.equal(parseRange(''), null);
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```
node --test extension/tests/unit/size-parser.test.js
```
Expected: the unit/fraction/open-ended tests fail; existing tests still pass.

- [ ] **Step 3: Replace `parseRange` in `size-parser.js`**

```js
function parseRange(cell) {
  if (!cell) return null;
  var s = cell
    .replace(/["""'']/g, '')
    // Normalise Unicode fractions before any other processing
    .replace(/½/g, '.5')
    .replace(/¼/g, '.25')
    .replace(/¾/g, '.75')
    // Strip trailing unit tokens (cm, in, inches, ")
    .replace(/\s*(centimeters?|centimetres?|cm|inches?|in|")\s*$/i, '')
    .replace(/\s/g, '');

  // Open-ended high: "34+"
  var openHigh = s.match(/^(\d+(?:\.\d+)?)\+$/);
  if (openHigh) return [parseFloat(openHigh[1]), 999];

  // Open-ended low: "upto34" (whitespace already stripped)
  var openLow = s.match(/^upto(\d+(?:\.\d+)?)$/i);
  if (openLow) return [0, parseFloat(openLow[1])];

  // Range: "32-34" or "32–34"
  var rangeMatch = s.match(/^(\d+(?:\.\d+)?)[–\-](\d+(?:\.\d+)?)$/);
  if (rangeMatch) return [parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2])];

  // Single value: "30"
  var singleMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) { var v = parseFloat(singleMatch[1]); return [v, v]; }

  return null;
}
```

- [ ] **Step 4: Run tests**

```
node --test extension/tests/unit/size-parser.test.js
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add extension/scripts/size-parser.js extension/tests/unit/size-parser.test.js
git commit -m "fix(extension): parseRange handles embedded units, Unicode fractions, open-ended ranges"
```

---

### Task B-4: Fix `recommender.js` — unit detection, no-measurements sentinel, partial-match warning, size order

**Files:**
- Modify: `extension/scripts/recommender.js`
- Modify: `extension/tests/unit/recommender.test.js`

**Interfaces:**
- Produces: `getRecommendation` returns `{ noMeasurements: true }` when no keys; adds coverage warning; uses normalised size order

- [ ] **Step 1: Add failing tests**

Replace `extension/tests/unit/recommender.test.js` with the complete test file:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRecommendation, detectChartUnit } = require('../../scripts/recommender.js');

// Test charts
const CHART_IN = {
  S: { bust: [32, 34], waist: [25, 27], hips: [35, 37] },
  M: { bust: [35, 37], waist: [28, 30], hips: [38, 40] },
  L: { bust: [38, 40], waist: [31, 33], hips: [41, 43] },
};

const CHART_CM = {
  S: { bust: [82, 86], waist: [63, 67], hips: [88, 92] },
  M: { bust: [87, 91], waist: [68, 72], hips: [93, 97] },
  L: { bust: [92, 96], waist: [73, 77], hips: [98, 102] },
};

const CHART_REVERSE_ORDER = {
  L: { bust: [38, 40], waist: [31, 33] },
  M: { bust: [35, 37], waist: [28, 30] },
  S: { bust: [32, 34], waist: [25, 27] },
};

const CHART_NUMERIC = {
  '10': { bust: [38, 40], waist: [31, 33] },
  '8':  { bust: [35, 37], waist: [28, 30] },
  '6':  { bust: [32, 34], waist: [25, 27] },
};

// --- detectChartUnit ---
test('detectChartUnit: returns cm when all values > 50', () => {
  assert.equal(detectChartUnit(CHART_CM), 'cm');
});
test('detectChartUnit: returns in when values are in the inch range', () => {
  assert.equal(detectChartUnit(CHART_IN), 'in');
});
test('detectChartUnit: uses median, not first cell — small neck value does not corrupt result', () => {
  // Chart has neck (14 in) as first measurement but rest are > 50 cm values
  const chart = {
    S: { neck: [35, 37], bust: [82, 86], waist: [63, 67] },
    M: { neck: [37, 39], bust: [87, 91], waist: [68, 72] },
  };
  assert.equal(detectChartUnit(chart), 'cm');
});

// --- No measurements sentinel ---
test('no measurements: returns noMeasurements sentinel', () => {
  const result = getRecommendation(CHART_IN, { unit: 'in' });
  assert.equal(result.noMeasurements, true);
  assert.equal(result.size, null);
});

// --- Perfect match ---
test('perfect match: returns correct size', () => {
  const result = getRecommendation(CHART_IN, { bust: 36, waist: 29, hips: 39, unit: 'in' });
  assert.equal(result.size, 'M');
  assert.equal(result.warning, null);
});

// --- Partial measurements coverage warning ---
test('partial match: adds coverage warning when fewer than half chart columns matched', () => {
  // Chart has 3 measurement columns; user only has bust (1 of 3 = less than half)
  const result = getRecommendation(CHART_IN, { bust: 36, unit: 'in' });
  assert.equal(result.size, 'M');
  assert.ok(result.warning, 'warning should be set');
  assert.match(result.warning, /1 of 3/);
});

// --- Between sizes (existing behaviour preserved) ---
test('between sizes: sizes up and reports which measurements drove the decision', () => {
  // Bust fits M, waist fits S — should size up to L
  const result = getRecommendation(CHART_IN, { bust: 36, waist: 26, unit: 'in' });
  assert.ok(result.size, 'should recommend a size');
  assert.ok(result.warning, 'should have a warning');
});

// --- Unit conversion ---
test('unit conversion: converts cm measurements to inches for an inch chart', () => {
  // User has cm measurements, chart is in inches
  const result = getRecommendation(CHART_IN, { bust: 91.4, waist: 73.7, hips: 99.1, unit: 'cm' });
  // 91.4cm ÷ 2.54 ≈ 36, 73.7cm ÷ 2.54 ≈ 29, 99.1cm ÷ 2.54 ≈ 39 → M
  assert.equal(result.size, 'M');
});

// --- Non-ascending size order ---
test('non-ascending alpha order: sizes are normalised before recommendation', () => {
  // CHART_REVERSE_ORDER has L, M, S — should still recommend M for M-range measurements
  const result = getRecommendation(CHART_REVERSE_ORDER, { bust: 36, waist: 29, unit: 'in' });
  assert.equal(result.size, 'M');
});

test('non-ascending numeric order: sizes are sorted numerically', () => {
  // CHART_NUMERIC has 10, 8, 6 out of order
  const result = getRecommendation(CHART_NUMERIC, { bust: 36, waist: 29, unit: 'in' });
  assert.equal(result.size, '8');
});

// --- Beyond largest size ---
test('beyond range: returns a message, does not crash', () => {
  const result = getRecommendation(CHART_IN, { bust: 50, waist: 44, hips: 54, unit: 'in' });
  assert.equal(result.size, null);
  assert.ok(result.warning);
});
```

- [ ] **Step 2: Run tests to verify the new tests fail**

```
node --test extension/tests/unit/recommender.test.js
```
Expected: the new tests for noMeasurements, partial warning, unit detection median, and size-order normalisation fail.

- [ ] **Step 3: Update `recommender.js`**

Replace the entire content of `recommender.js` with:

```js
var CM_PER_INCH = 2.54;

var ALPHA_SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '1X', '2X', '3X', '4X'];

function normaliseSizeOrder(keys) {
  if (keys.every(function (k) { return !isNaN(Number(k)); })) {
    return keys.slice().sort(function (a, b) { return Number(a) - Number(b); });
  }
  var upper = keys.map(function (k) { return k.toUpperCase(); });
  if (upper.every(function (k) { return ALPHA_SIZE_ORDER.indexOf(k) !== -1; })) {
    return keys.slice().sort(function (a, b) {
      return ALPHA_SIZE_ORDER.indexOf(a.toUpperCase()) - ALPHA_SIZE_ORDER.indexOf(b.toUpperCase());
    });
  }
  return keys;
}

function detectChartUnit(chart) {
  // Collect all range values across the chart, excluding sentinel values (0, 999)
  var allValues = [];
  Object.values(chart).forEach(function (sizeData) {
    Object.values(sizeData).forEach(function (range) {
      if (range && range[0] !== 0 && range[0] !== 999) allValues.push(range[0]);
      if (range && range[1] !== 999 && range[1] !== 0) allValues.push(range[1]);
    });
  });
  if (allValues.length === 0) return 'in';
  allValues.sort(function (a, b) { return a - b; });
  var median = allValues[Math.floor(allValues.length / 2)];
  return median > 50 ? 'cm' : 'in';
}

function toChartUnits(measurements, keys, chartUnit) {
  var result = {};
  keys.forEach(function (key) {
    var val = parseFloat(measurements[key]);
    if (isNaN(val)) return;
    if (measurements.unit === 'cm' && chartUnit === 'in') result[key] = val / CM_PER_INCH;
    else if (measurements.unit === 'in' && chartUnit === 'cm') result[key] = val * CM_PER_INCH;
    else result[key] = val;
  });
  return result;
}

function buildDetails(sizeRanges, userVals, keys, chartUnit) {
  return keys
    .filter(function (k) { return sizeRanges && sizeRanges[k]; })
    .map(function (k) {
      return {
        measurement: k,
        value: Math.round(userVals[k] * 10) / 10,
        rangeLabel: sizeRanges[k][0] + '–' + sizeRanges[k][1] + (chartUnit === 'cm' ? 'cm' : '"'),
      };
    });
}

function getChartColumnCount(chart) {
  var keys = new Set();
  Object.values(chart).forEach(function (sizeData) {
    Object.keys(sizeData).forEach(function (k) { keys.add(k); });
  });
  return keys.size;
}

function getRecommendation(chart, measurements) {
  var measurementKeys = Object.keys(measurements).filter(function (k) { return k !== 'unit'; });

  // Sentinel: no saved measurements
  if (measurementKeys.length === 0) {
    return { size: null, noMeasurements: true, details: [], warning: null };
  }

  var chartUnit = detectChartUnit(chart);
  var userInChartUnits = toChartUnits(measurements, measurementKeys, chartUnit);
  var sizeOrder = normaliseSizeOrder(Object.keys(chart));
  var chartColumnCount = getChartColumnCount(chart);

  // Count how many of the user's measurements fall within each size range
  var scores = {};
  sizeOrder.forEach(function (size) {
    var matches = 0, checked = 0;
    measurementKeys.forEach(function (key) {
      var range = chart[size][key];
      if (!range) return;
      checked++;
      if (userInChartUnits[key] >= range[0] && userInChartUnits[key] <= range[1]) matches++;
    });
    if (checked > 0) scores[size] = { matches: matches, checked: checked };
  });

  // Perfect match: all available measurements fit one size
  var perfect = sizeOrder.find(function (s) {
    return scores[s] && scores[s].matches === scores[s].checked;
  });
  if (perfect) {
    var details = buildDetails(chart[perfect], userInChartUnits, measurementKeys, chartUnit);
    var checked = details.length;
    var coverageWarning = checked < Math.ceil(chartColumnCount / 2)
      ? 'Matched on ' + checked + ' of ' + chartColumnCount + ' measurements — save more for a better result'
      : null;
    return { size: perfect, details: details, warning: coverageWarning };
  }

  // Partial match: most hits, then size up
  var withMatches = sizeOrder.filter(function (s) { return scores[s] && scores[s].matches > 0; });
  if (withMatches.length > 0) {
    var best = withMatches.reduce(function (a, b) {
      return scores[b].matches > scores[a].matches ? b : a;
    });
    var idx = sizeOrder.indexOf(best);
    var sizedUp = sizeOrder[idx + 1] || best;
    return {
      size: sizedUp,
      details: buildDetails(chart[sizedUp] || chart[best], userInChartUnits, measurementKeys, chartUnit),
      warning: 'Between sizes — sized up to ' + sizedUp,
    };
  }

  // Nothing landed inside any size range — find the highest size still net "too small"
  var lower = null;
  sizeOrder.forEach(function (size) {
    var net = measurementKeys.reduce(function (sum, key) {
      var range = chart[size][key];
      if (!range) return sum;
      var val = userInChartUnits[key];
      if (val > range[1]) return sum + 1;
      if (val < range[0]) return sum - 1;
      return sum;
    }, 0);
    if (net > 0) lower = size;
  });

  var lowerIdx = lower ? sizeOrder.indexOf(lower) : -1;
  var upper = lowerIdx >= 0 ? sizeOrder[lowerIdx + 1] : null;
  if (!lower || !upper) {
    return { size: null, details: [], warning: "Your measurements are outside this chart's size range" };
  }

  var exceeds = measurementKeys.filter(function (key) {
    var range = chart[lower][key];
    return range && userInChartUnits[key] > range[1];
  });

  return {
    size: upper,
    details: buildDetails(chart[upper], userInChartUnits, measurementKeys, chartUnit),
    warning: 'Between ' + lower + ' and ' + upper + ' — sized up because your ' +
      exceeds.join(', ') + (exceeds.length > 1 ? ' are' : ' is') + ' larger than ' + lower + "'s range",
  };
}

// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { getRecommendation, detectChartUnit, normaliseSizeOrder };
}
```

- [ ] **Step 4: Run tests**

```
node --test extension/tests/unit/recommender.test.js
```
Expected: all tests pass.

- [ ] **Step 5: Run all unit tests together**

```
node --test extension/tests/unit/size-parser.test.js extension/tests/unit/recommender.test.js extension/tests/unit/site-detector.test.js
```
Expected: all pass.

- [ ] **Step 6: Commit**

```
git add extension/scripts/recommender.js extension/tests/unit/recommender.test.js
git commit -m "fix(extension): recommender — unit detection, no-measurements sentinel, partial warning, size order"
```

---

### Task B-5: Final cleanup and full test run

**Files:**
- No new files

- [ ] **Step 1: Run the full unit test suite**

```
node --test extension/tests/unit/size-parser.test.js extension/tests/unit/recommender.test.js extension/tests/unit/site-detector.test.js
```
Expected: all tests pass with no failures or warnings.

- [ ] **Step 2: Verify the browser still loads correctly**

Open `chrome://extensions`, reload the extension, open a Loft product page. No JS console errors should appear. The panel should render (sign-in panel if not logged in is fine).

- [ ] **Step 3: Commit**

```
git add extension/scripts/site-detector.js extension/tests/unit/site-detector.test.js
git commit -m "test(extension): add site-detector unit tests"
```

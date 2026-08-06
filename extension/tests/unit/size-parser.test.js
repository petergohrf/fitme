const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSizeChart, parseRange } = require('../../scripts/size-parser.js');

test('smoke: parseSizeChart returns null for empty string', () => {
  assert.equal(parseSizeChart(''), null);
});

test('smoke: parseRange handles a simple range', () => {
  assert.deepEqual(parseRange('32-34'), [32, 34]);
});

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

// --- B-3: Fix parseRange — embedded units, Unicode fractions, open-ended ranges ---

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

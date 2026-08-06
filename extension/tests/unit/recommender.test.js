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

test('partial match: adds coverage warning even when 2 of 3 chart columns matched', () => {
  // Chart has 3 measurement columns; user has bust + waist (2 of 3)
  // 2 < ceil(3/2)=2 is FALSE under the old threshold — this test catches that regression
  const result = getRecommendation(CHART_IN, { bust: 36, waist: 29, unit: 'in' });
  assert.equal(result.size, 'M');
  assert.ok(result.warning, 'warning should be set for any gap');
  assert.match(result.warning, /2 of 3/);
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

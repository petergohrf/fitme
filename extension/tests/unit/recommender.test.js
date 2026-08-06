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

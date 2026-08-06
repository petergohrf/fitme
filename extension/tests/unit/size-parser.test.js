const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSizeChart, parseRange } = require('../../scripts/size-parser.js');

test('smoke: parseSizeChart returns null for empty string', () => {
  assert.equal(parseSizeChart(''), null);
});

test('smoke: parseRange handles a simple range', () => {
  assert.deepEqual(parseRange('32-34'), [32, 34]);
});

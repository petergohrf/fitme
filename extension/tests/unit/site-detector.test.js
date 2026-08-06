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

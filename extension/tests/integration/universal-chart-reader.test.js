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

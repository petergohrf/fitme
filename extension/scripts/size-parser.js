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

// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { parseSizeChart, buildColumnMap, parseRange };
}

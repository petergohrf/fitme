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

  // Open-ended high: "34+" or "34plus" (whitespace already stripped)
  var openHigh = s.match(/^(\d+(?:\.\d+)?)(?:\+|plus)$/i);
  if (openHigh) return [parseFloat(openHigh[1]), 999];

  // Open-ended low: "upto34" or "under34" (whitespace already stripped)
  var openLow = s.match(/^(?:upto|under)(\d+(?:\.\d+)?)$/i);
  if (openLow) return [0, parseFloat(openLow[1])];

  // Range: "32-34" or "32–34"
  var rangeMatch = s.match(/^(\d+(?:\.\d+)?)[–\-](\d+(?:\.\d+)?)$/);
  if (rangeMatch) return [parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2])];

  // Single value: "30"
  var singleMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) { var v = parseFloat(singleMatch[1]); return [v, v]; }

  return null;
}

// Allow Node.js unit testing — no-op in browser (no module global)
if (typeof module !== 'undefined') {
  module.exports = { parseSizeChart, buildColumnMap, parseRange, findSizeNameColumnIndex };
}

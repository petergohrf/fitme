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
    var coverageWarning = checked < chartColumnCount
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

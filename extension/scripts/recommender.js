const CM_PER_INCH = 2.54;

function getRecommendation(chart, measurements) {
  const measurementKeys = Object.keys(measurements).filter(k => k !== 'unit');
  const chartUnit = detectChartUnit(chart);
  const userInChartUnits = toChartUnits(measurements, measurementKeys, chartUnit);
  const sizeOrder = Object.keys(chart);

  // Count how many of the user's measurements fall within each size range
  const scores = {};
  for (const size of sizeOrder) {
    let matches = 0, checked = 0;
    for (const key of measurementKeys) {
      const range = chart[size][key];
      if (!range) continue;
      checked++;
      if (userInChartUnits[key] >= range[0] && userInChartUnits[key] <= range[1]) matches++;
    }
    if (checked > 0) scores[size] = { matches, checked };
  }

  // Perfect match: all available measurements fit one size
  const perfect = sizeOrder.find(s => scores[s] && scores[s].matches === scores[s].checked);
  if (perfect) {
    return { size: perfect, details: buildDetails(chart[perfect], userInChartUnits, measurementKeys, chartUnit), warning: null };
  }

  // Partial match: find size with most hits, then size up
  const withMatches = sizeOrder.filter(s => scores[s] && scores[s].matches > 0);
  if (withMatches.length > 0) {
    const best = withMatches.reduce((a, b) => scores[b].matches > scores[a].matches ? b : a);
    const idx = sizeOrder.indexOf(best);
    const sizedUp = sizeOrder[idx + 1] || best;
    return {
      size: sizedUp,
      details: buildDetails(chart[sizedUp] || chart[best], userInChartUnits, measurementKeys, chartUnit),
      warning: 'Between sizes — sized up to ' + sizedUp,
    };
  }

  // Nothing landed inside any size's range — the user is between sizes on
  // every available measurement (e.g. bust says Medium/Large, waist says
  // Small/Medium). Find the highest size that's still net "too small for
  // the user", and size up from there.
  let lower = null;
  for (const size of sizeOrder) {
    const net = measurementKeys.reduce((sum, key) => {
      const range = chart[size][key];
      if (!range) return sum;
      const val = userInChartUnits[key];
      if (val > range[1]) return sum + 1;
      if (val < range[0]) return sum - 1;
      return sum;
    }, 0);
    if (net > 0) lower = size;
  }

  const lowerIdx = lower ? sizeOrder.indexOf(lower) : -1;
  const upper = lowerIdx >= 0 ? sizeOrder[lowerIdx + 1] : null;
  if (!lower || !upper) {
    return { size: null, details: [], warning: "Your measurements are outside this chart's size range" };
  }

  const exceeds = measurementKeys.filter(key => {
    const range = chart[lower][key];
    return range && userInChartUnits[key] > range[1];
  });

  return {
    size: upper,
    details: buildDetails(chart[upper], userInChartUnits, measurementKeys, chartUnit),
    warning: `Between ${lower} and ${upper} — sized up because your ${exceeds.join(', ')} ${exceeds.length > 1 ? 'are' : 'is'} larger than ${lower}'s range`,
  };
}

function detectChartUnit(chart) {
  const firstRange = Object.values(Object.values(chart)[0])[0];
  return firstRange && firstRange[0] >= 50 ? 'cm' : 'in';
}

function toChartUnits(measurements, keys, chartUnit) {
  const result = {};
  for (const key of keys) {
    const val = parseFloat(measurements[key]);
    if (isNaN(val)) continue;
    if (measurements.unit === 'cm' && chartUnit === 'in') result[key] = val / CM_PER_INCH;
    else if (measurements.unit === 'in' && chartUnit === 'cm') result[key] = val * CM_PER_INCH;
    else result[key] = val;
  }
  return result;
}

function buildDetails(sizeRanges, userVals, keys, chartUnit) {
  return keys
    .filter(k => sizeRanges && sizeRanges[k])
    .map(k => ({
      measurement: k,
      value: Math.round(userVals[k] * 10) / 10,
      rangeLabel: sizeRanges[k][0] + '–' + sizeRanges[k][1] + (chartUnit === 'cm' ? 'cm' : '"'),
    }));
}

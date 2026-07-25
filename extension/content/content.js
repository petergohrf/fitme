const FITME_MANNEQUIN_URL = 'https://petergohrf.github.io/fitme/mannequin.html';

(async () => {
  const site = detectSite(window.location.href);
  if (!site) return;

  const userId = await new Promise(resolve =>
    chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => resolve(r?.userId || null))
  );

  if (!userId) {
    inject(signInPanel());
    return;
  }

  if (site.type === 'tag-only') {
    const measurements = await fetchMeasurements(userId).catch(() => null);
    inject(tagOnlyPanel(measurements));
    return;
  }

  let markdown, chart, measurements;
  try {
    [markdown, measurements] = await Promise.all([
      fetchPageMarkdown(window.location.href),
      fetchMeasurements(userId),
    ]);
    chart = parseSizeChart(markdown);
  } catch {
    inject(errorPanel());
    return;
  }

  if (!chart) {
    console.info('[FitMe] No size chart found on', window.location.href);
    inject(noChartPanel(measurements));
    return;
  }

  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');
  inject(recommendationPanel(rec));
})();

function inject(html) {
  document.getElementById('fitme-panel')?.remove();
  const div = document.createElement('div');
  div.id = 'fitme-panel';
  div.innerHTML = html;
  document.body.appendChild(div);
  div.querySelector('.fm-close')?.addEventListener('click', () => div.remove());
}

function shell(body) {
  return `<div class="fm-header"><span>👗 FitMe</span><button class="fm-close" title="Dismiss">✕</button></div><div class="fm-body">${body}</div>`;
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function recommendationPanel(rec) {
  if (!rec.size) return shell(`<p class="fm-message">${rec.warning}</p>`);
  const rows = rec.details.map(d =>
    `<div class="fm-row"><span>${cap(d.measurement)}</span><span>${d.value} → ${d.rangeLabel}</span></div>`
  ).join('');
  const warn = rec.warning ? `<div class="fm-warning">${rec.warning}</div>` : '';
  return shell(`
    <div class="fm-size">Recommended: Size ${rec.size}</div>
    <div class="fm-details">${rows}</div>
    ${warn}
    <a class="fm-link" href="${FITME_MANNEQUIN_URL}" target="_blank" rel="noopener noreferrer">Preview on your FitMe mannequin →</a>
  `);
}

function signInPanel() {
  return shell(`<p class="fm-message">Sign in to FitMe to get size recommendations while you shop.</p>`);
}

function noChartPanel(measurements) {
  const rows = measurementRows(measurements);
  return shell(`<p class="fm-message">Couldn't read a size chart — here are your measurements to compare manually:</p><div class="fm-details">${rows}</div>`);
}

function tagOnlyPanel(measurements) {
  const rows = measurementRows(measurements);
  return shell(`<p class="fm-message">Poshmark shows a tag size only. Here are your measurements to compare:</p><div class="fm-details">${rows}</div>`);
}

function errorPanel() {
  return shell(`<p class="fm-message">Something went wrong fetching size data. Try refreshing the page.</p>`);
}

function measurementRows(measurements) {
  if (!measurements) return '';
  return Object.entries(measurements)
    .filter(([k]) => k !== 'unit')
    .map(([k, v]) => `<div class="fm-row"><span>${cap(k)}</span><span>${v}${measurements.unit}</span></div>`)
    .join('');
}

const FITME_MANNEQUIN_URL = 'https://petergohrf.github.io/fitme/mannequin.html';

async function runFitMe() {
  const site = detectSite(window.location.href);
  if (!site) return;

  let userId;
  try {
    userId = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_USER_ID' }, r => {
          if (chrome.runtime.lastError) { resolve('__context_invalid__'); return; }
          resolve(r?.userId || null);
        });
      } catch (e) {
        resolve('__context_invalid__');
      }
    });
  } catch (e) {
    userId = '__context_invalid__';
  }

  if (userId === '__context_invalid__') {
    return;
  }

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
      readSizeChart(window.location.href),
      fetchMeasurements(userId),
    ]);
    chart = markdown ? parseSizeChart(markdown) : null;
  } catch (e) {
    console.error('[FitMe] Failed to fetch size data:', e);
    inject(errorPanel());
    return;
  }

  if (!chart) {
    console.info('[FitMe] No size chart found on', window.location.href);
    inject(noChartPanel(measurements));
    return;
  }

  console.info('[FitMe DEBUG] measurements from Firestore:', JSON.stringify(measurements));
  console.info('[FitMe DEBUG] parsed chart:', JSON.stringify(chart));

  const rec = getRecommendation(chart, measurements);
  console.info('[FitMe] Recommendation:', rec.size, rec.warning || '');

  if (rec.noMeasurements) {
    inject(noMeasurementsPanel());
    return;
  }
  inject(recommendationPanel(rec));
}

runFitMe();
installSpaHook();

function installSpaHook() {
  if (window.__fitme_spa_hook) return; // idempotent — only install once per page lifetime
  window.__fitme_spa_hook = true;

  var originalPushState = history.pushState.bind(history);
  history.pushState = function () {
    originalPushState.apply(history, arguments);
    onUrlChange();
  };
  window.addEventListener('popstate', onUrlChange);
}

function onUrlChange() {
  // Wait for the SPA framework to render the new product before reading the chart.
  // 800ms covers React and Vue re-render cycles on typical product pages.
  setTimeout(function () {
    var site = detectSite(window.location.href);
    if (!site) {
      document.getElementById('fitme-panel')?.remove();
      return;
    }
    runFitMe();
  }, 800);
}

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

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function recommendationPanel(rec) {
  if (!rec.size) return shell(`<p class="fm-message">${esc(rec.warning)}</p>`);
  const rows = rec.details.map(d =>
    `<div class="fm-row"><span>${cap(esc(d.measurement))}</span><span>${esc(d.value)} → ${esc(d.rangeLabel)}</span></div>`
  ).join('');
  const warn = rec.warning ? `<div class="fm-warning">${esc(rec.warning)}</div>` : '';
  return shell(`
    <div class="fm-size">Recommended: Size ${esc(rec.size)}</div>
    <div class="fm-details">${rows}</div>
    ${warn}
    <a class="fm-link" href="${FITME_MANNEQUIN_URL}" target="_blank" rel="noopener noreferrer">Preview on your FitMe mannequin →</a>
  `);
}

function signInPanel() {
  return shell(`<p class="fm-message">Sign in to FitMe to get size recommendations while you shop.</p>`);
}

function refreshPanel() {
  runFitMe();
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
    .map(([k, v]) => `<div class="fm-row"><span>${cap(esc(k))}</span><span>${esc(v)}${esc(measurements.unit)}</span></div>`)
    .join('');
}

function noMeasurementsPanel() {
  return shell('<p class="fm-message">Save your measurements on FitMe to get size recommendations.</p>' +
    '<a class="fm-link" href="' + FITME_MANNEQUIN_URL + '" target="_blank" rel="noopener noreferrer">Go to FitMe →</a>');
}

chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === 'AUTH_CHANGED') {
    runFitMe();
  }
});

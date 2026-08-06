// Universal chart reader - reads size charts from product pages.
// Three-phase cascade:
//   1. Score tables already in DOM
//   2. Find + click a size-chart trigger, wait for a table via MutationObserver
//   3. Fall back to fetching Jina markdown via the service worker

var SCORE_KEYWORDS = ['bust', 'chest', 'waist', 'hip', 'inseam', 'neck', 'thigh', 'shoulder', 'sleeve'];

function scoreTable(table) {
  var text = Array.from(table.querySelectorAll('th'))
    .map(function (th) { return th.textContent.toLowerCase(); })
    .join(' ');
  return SCORE_KEYWORDS.filter(function (kw) { return text.indexOf(kw) !== -1; }).length;
}

function tableToMarkdown(table) {
  var rows = Array.from(table.querySelectorAll('tr')).map(function (tr) {
    var cells = [];
    Array.from(tr.children).forEach(function (cell) {
      var text = cell.textContent.trim().replace(/\s+/g, ' ');
      var span = parseInt(cell.getAttribute('colspan') || '1', 10);
      for (var i = 0; i < span; i++) { cells.push(text); }
    });
    return cells;
  });
  if (rows.length < 2) return '';
  // Normalise row widths: rows affected by rowspan produce fewer explicit cells
  // than the header row after colspan expansion. Pad them so every row has the
  // same column count — required for valid markdown output.
  var width = rows[0].length;
  rows = rows.map(function (r) {
    while (r.length < width) { r.push(''); }
    return r;
  });
  var line = function (cells) { return '| ' + cells.join(' | ') + ' |'; };
  var sep = rows[0].map(function () { return '---'; });
  return [line(rows[0]), line(sep)].concat(rows.slice(1).map(line)).join('\n');
}

function findBestTable() {
  var tables = Array.from(document.querySelectorAll('table'));
  var best = null, bestScore = 0;
  tables.forEach(function (t) {
    var s = scoreTable(t);
    if (s > bestScore) { best = t; bestScore = s; }
  });
  return bestScore >= 2 ? best : null;
}

function findSizeChartTrigger() {
  var els = Array.from(document.querySelectorAll('a, button, [role="button"], summary'));
  var scored = els.map(function (el) {
    var t = el.textContent.trim().toLowerCase();
    if (/\bsize chart\b/.test(t)) return { el: el, score: 3 };
    if (/size.*(chart|guide)/.test(t)) return { el: el, score: 2 };
    if (/fit.*(chart|guide)/.test(t)) return { el: el, score: 2 };
    if (/\bsizing\b/.test(t)) return { el: el, score: 1 };
    return null;
  }).filter(Boolean);
  if (!scored.length) return null;
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored[0].el;
}

function waitForScoredTable(timeoutMs) {
  return new Promise(function (resolve) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = Array.from(mutations[i].addedNodes);
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType !== 1) continue;
          var tables = node.tagName === 'TABLE'
            ? [node]
            : Array.from(node.querySelectorAll('table'));
          for (var k = 0; k < tables.length; k++) {
            if (scoreTable(tables[k]) >= 2) {
              observer.disconnect();
              resolve(tables[k]);
              return;
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); resolve(null); }, timeoutMs || 5000);
  });
}

function fetchPageMarkdown(url) {
  return new Promise(function (resolve, reject) {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_JINA_MARKDOWN', url: url }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.ok) {
          reject(new Error((response && response.error) || 'Jina fetch failed'));
          return;
        }
        resolve(response.markdown);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function readSizeChart(url) {
  // Phase 1: score tables already in DOM
  var existing = findBestTable();
  if (existing) return Promise.resolve(tableToMarkdown(existing));

  // Phase 2: click size chart trigger, wait for table via MutationObserver
  var trigger = findSizeChartTrigger();
  if (trigger) {
    var tablePromise = waitForScoredTable(5000);
    trigger.click();
    return tablePromise.then(function (table) {
      if (table) return tableToMarkdown(table);
      return fetchPageMarkdown(url).catch(function () { return null; });
    });
  }

  // Phase 3: Jina fallback
  return fetchPageMarkdown(url).catch(function () { return null; });
}

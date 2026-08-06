// Known fallback sites (Jina returns no size chart): loft.com
// Loft renders its size chart via JavaScript — Jina only captures static HTML,
// so the chart is invisible to the parser. The extension falls back to showing
// raw measurements. To fix: consider direct DOM reading for Loft in a future task.
//
// Amazon: Jina is not used at all — Amazon's bot detection blocks Jina's crawler
// outright (403/CAPTCHA), so content.js reads Amazon's size chart directly from
// the DOM instead. See dom-chart-reader.js.
//
// The fetch itself runs in the background service worker, not here: content
// scripts are still bound by the host page's CORS policy even when the
// extension declares host_permissions for the target — only the service
// worker gets the CORS bypass. So this just relays to the background script.
function fetchPageMarkdown(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FETCH_JINA_MARKDOWN', url }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error(response && response.error || 'Jina fetch failed'));
        return;
      }
      resolve(response.markdown);
    });
  });
}

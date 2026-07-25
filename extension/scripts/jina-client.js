// Known fallback sites (Jina returns no size chart): loft.com
// Loft renders its size chart via JavaScript — Jina only captures static HTML,
// so the chart is invisible to the parser. The extension falls back to showing
// raw measurements. To fix: consider direct DOM reading for Loft in a future task.
async function fetchPageMarkdown(url) {
  const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(url);
  const response = await fetch(jinaUrl, { headers: { 'Accept': 'text/markdown' } });
  if (!response.ok) throw new Error('Jina fetch failed: ' + response.status + ' for ' + url);
  return response.text();
}

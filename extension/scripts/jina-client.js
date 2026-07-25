async function fetchPageMarkdown(url) {
  const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(url);
  const response = await fetch(jinaUrl, { headers: { 'Accept': 'text/markdown' } });
  if (!response.ok) throw new Error('Jina fetch failed: ' + response.status + ' for ' + url);
  return response.text();
}

// Mirrors the host patterns in manifest.json content_scripts.matches
var SHOPPING_PATTERNS = [
  '*://*.loft.com/*',
  '*://*.anntaylor.com/*',
  '*://*.amazon.com/*',
  '*://*.poshmark.com/*',
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STORE_USER_ID') {
    chrome.storage.local.set({ fitme_user_id: message.userId }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'GET_USER_ID') {
    chrome.storage.local.get('fitme_user_id', (result) => {
      sendResponse({ userId: result.fitme_user_id || null });
    });
    return true;
  }

  if (message.type === 'CLEAR_USER_ID') {
    chrome.storage.local.remove('fitme_user_id', function () {
      sendResponse({ ok: true });
      // Notify all open shopping tabs that auth has changed
      chrome.tabs.query({ url: SHOPPING_PATTERNS }, function (tabs) {
        (tabs || []).forEach(function (tab) {
          chrome.tabs.sendMessage(tab.id, { type: 'AUTH_CHANGED' }).catch(function () {
            // Tab may have no content script — ignore
          });
        });
      });
    });
    return true;
  }

  if (message.type === 'FETCH_JINA_MARKDOWN') {
    const jinaUrl = 'https://r.jina.ai/' + encodeURIComponent(message.url);
    fetch(jinaUrl, { headers: { 'Accept': 'text/markdown' } })
      .then((response) => {
        if (!response.ok) throw new Error('Jina fetch failed: ' + response.status + ' for ' + message.url);
        return response.text();
      })
      .then((markdown) => sendResponse({ ok: true, markdown }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

// Runs in the isolated world. Receives Clerk state from page-bridge.js (MAIN world)
// via postMessage, then stores the user ID in chrome.storage via the service worker.

function sendWithRetry(message, attemptsLeft) {
  // If the extension was reloaded (common while developing) while this tab was
  // already open, this tab's content script is orphaned and chrome.runtime.sendMessage
  // throws synchronously instead of failing through the callback. Nothing to retry —
  // the tab needs a refresh to pick up the new content script.
  try {
    chrome.runtime.sendMessage(message, function () {
      if (chrome.runtime.lastError && attemptsLeft > 0) {
        setTimeout(function () { sendWithRetry(message, attemptsLeft - 1); }, 500);
      }
    });
  } catch (e) {
    // Extension context invalidated — ignore.
  }
}

window.addEventListener('message', function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== '__FITME_CLERK__') return;
  var userId = event.data.userId;
  if (userId) {
    sendWithRetry({ type: 'STORE_USER_ID', userId: userId }, 3);
  } else {
    sendWithRetry({ type: 'CLEAR_USER_ID' }, 3);
  }
});

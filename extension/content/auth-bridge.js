// Runs in the isolated world. Receives Clerk state from page-bridge.js (MAIN world)
// via postMessage, then stores the user ID in chrome.storage via the service worker.

function sendWithRetry(message, attemptsLeft) {
  chrome.runtime.sendMessage(message, function () {
    if (chrome.runtime.lastError && attemptsLeft > 0) {
      setTimeout(function () { sendWithRetry(message, attemptsLeft - 1); }, 500);
    }
  });
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
